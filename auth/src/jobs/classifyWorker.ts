import { randomUUID } from "crypto"
import { pool } from "../db"
import { classifyCategory } from "./classify"
import { draftReplyFromKb } from "./kbReply"
import { getBoss, QUEUE_CLASSIFY_TICKET } from "./queue"

interface ClassifyJobData {
  ticket_id: string
  ticket_subject: string
  ticket_body: string
  from_name?: string | null
}

export async function startClassifyWorker(): Promise<void> {
  const boss = await getBoss()

  await boss.work<ClassifyJobData>(QUEUE_CLASSIFY_TICKET, async ([job]) => {
    const { ticket_id, ticket_subject, ticket_body, from_name } = job.data

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("AI service not configured")
    }

    const category = await classifyCategory(ticket_subject, ticket_body)
    await pool.query(`UPDATE tickets SET category = $1::category, updated_at = now() WHERE id = $2`, [
      category,
      ticket_id,
    ])

    const kbReply = await draftReplyFromKb(ticket_subject, ticket_body, from_name)
    if (kbReply) {
      // Auto-sent as the agent — no human review. Only reached when a knowledgebase
      // article directly answers the ticket (draftReplyFromKb returns null otherwise).
      await pool.query(
        `INSERT INTO ticket_replies (id, ticket_id, author_id, body, sender_type, created_at)
         VALUES ($1, $2, NULL, $3, 'agent', now())`,
        [randomUUID(), ticket_id, kbReply],
      )
      // The knowledgebase fully answered the question, so there's nothing left for an agent to do.
      await pool.query(
        `UPDATE tickets SET status = 'resolved'::ticketstatus, resolved_at = now(), resolved_by_ai = true, updated_at = now() WHERE id = $1`,
        [ticket_id],
      )
    } else {
      // Couldn't auto-resolve — hand it back to a human agent instead of leaving it stuck on AI.
      await pool.query(`UPDATE tickets SET assignee_id = NULL, updated_at = now() WHERE id = $1`, [ticket_id])
    }
  })

  console.log(`Classify worker listening on queue "${QUEUE_CLASSIFY_TICKET}"`)
}

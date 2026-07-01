import { Router } from "express"
import { z } from "zod"
import { getBoss, QUEUE_CLASSIFY_TICKET } from "../jobs/queue"

const router = Router()

const bodySchema = z.object({
  ticket_id: z.string().min(1).max(200),
  ticket_subject: z.string().min(1).max(500),
  ticket_body: z.string().min(1).max(20000),
  from_name: z.string().max(200).nullable().optional(),
})

router.post("/", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() })
    return
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(503).json({ error: "AI service not configured" })
    return
  }

  try {
    const boss = await getBoss()
    await boss.send(QUEUE_CLASSIFY_TICKET, parsed.data, { singletonKey: parsed.data.ticket_id })
    res.status(202).json({ queued: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to queue classification"
    res.status(502).json({ error: message })
  }
})

export default router

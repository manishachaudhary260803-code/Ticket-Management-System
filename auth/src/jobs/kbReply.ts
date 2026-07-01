import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import { pool } from "../db"

const draftReplySchema = z.object({
  matched: z.boolean(),
  reply: z.string(),
})

interface KbArticle {
  title: string
  content: string
}

export async function draftReplyFromKb(
  ticketSubject: string,
  ticketBody: string,
  fromName: string | null | undefined,
): Promise<string | null> {
  const { rows } = await pool.query<KbArticle>("SELECT title, content FROM knowledgebase_articles")
  if (rows.length === 0) {
    return null
  }

  const kbContext = rows.map((a) => `### ${a.title}\n${a.content}`).join("\n\n")
  const firstName = fromName?.trim().split(/\s+/)[0]

  const { object } = await generateObject({
    model: openai("gpt-5-nano"),
    schema: draftReplySchema,
    system:
      "You are a student support assistant for CodeWithMe. You are given a support ticket and a set of " +
      "knowledgebase articles. If one or more articles directly answer the student's question, draft a reply " +
      "based strictly on that knowledgebase content and set matched=true. Do not invent information that isn't " +
      "in the articles. If none of the articles are relevant to the ticket, set matched=false and leave reply empty.\n\n" +
      "When matched, format the reply as a proper email: " +
      (firstName ? `open with a greeting addressing the student by their first name, "${firstName}". ` : "open with a friendly greeting. ") +
      "Use a professional, warm, customer-friendly tone. Write the answer in short, clear paragraphs (or a bullet " +
      "list for step-by-step instructions). Close with a sign-off on its own line: \"Best regards,\\nCodeWithMe Support\".",
    prompt: `Knowledgebase articles:\n\n${kbContext}\n\n---\n\nTicket subject: ${ticketSubject}\n\nTicket body: ${ticketBody}`,
  })

  return object.matched && object.reply.trim() ? object.reply : null
}

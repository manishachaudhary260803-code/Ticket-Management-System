import { Router } from "express"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { z } from "zod"

const router = Router()

const replySchema = z.object({
  sender_type: z.enum(["agent", "customer"]),
  author_name: z.string().nullable().optional(),
  body: z.string().max(20000),
})

const bodySchema = z.object({
  ticket_subject: z.string().min(1).max(500),
  ticket_body: z.string().min(1).max(20000),
  replies: z.array(replySchema).max(200),
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

  const { ticket_subject, ticket_body, replies } = parsed.data

  const conversation = [
    `Subject: ${ticket_subject}`,
    `\n[Original Email]\n${ticket_body}`,
    ...replies.map((r) => {
      const label = r.sender_type === "agent" ? `Agent (${r.author_name ?? "Support"})` : "Customer"
      return `\n[${label}]\n${r.body}`
    }),
  ].join("\n")

  try {
    const { text } = await generateText({
      model: openai("gpt-5-nano"),
      system:
        "You are a support ticket assistant. Summarize the following support ticket conversation. " +
        "Cover: the original issue, key points discussed, any resolutions offered, and the current status of the conversation. " +
        "Be concise — 3 to 5 sentences maximum. Return only the summary text, no commentary or labels.",
      prompt: conversation,
    })

    res.json({ summary: text })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI request failed"
    res.status(502).json({ error: message })
  }
})

export default router

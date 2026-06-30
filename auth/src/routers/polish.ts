import { Router } from "express"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { z } from "zod"

const router = Router()

const bodySchema = z.object({
  draft: z.string().min(1).max(10000),
  agent_name: z.string().min(1).max(200),
  customer_first_name: z.string().max(200).optional(),
})

router.post("/", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() })
    return
  }

  const { draft, agent_name, customer_first_name } = parsed.data

  if (!process.env.OPENAI_API_KEY) {
    res.status(503).json({ error: "AI service not configured" })
    return
  }

  try {
    const { text } = await generateText({
      model: openai("gpt-5-nano"),
      system:
        "You are a professional support agent. Polish the given reply draft to be clear, empathetic, and professional. " +
        "Keep the same intent and length — improve tone and grammar only. " +
        (customer_first_name ? `Begin the reply by addressing the customer by their first name: "${customer_first_name}". ` : "") +
        "Return only the improved reply text, no commentary.",
      prompt: `Draft reply:\n${draft}`,
    })

    const signed = `${text}\n\nBest regards,\n${agent_name}\nhttps://codewithme.com`
    res.json({ polished: signed })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI request failed"
    res.status(502).json({ error: message })
  }
})

export default router

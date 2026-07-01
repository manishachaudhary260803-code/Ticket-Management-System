import { Router } from "express"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

const router = Router()

const bodySchema = z.object({
  ticket_subject: z.string().min(1).max(500),
  ticket_body: z.string().min(1).max(20000),
})

const categorySchema = z.object({
  category: z.enum(["technical_it", "billing_fees", "other"]),
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

  const { ticket_subject, ticket_body } = parsed.data

  try {
    const { object } = await generateObject({
      model: openai("gpt-5-nano"),
      schema: categorySchema,
      system:
        "You classify student support tickets into exactly one category. " +
        "technical_it: IT/technical issues such as login problems, software, hardware, or systems access. " +
        "billing_fees: billing, payments, fees, refunds, or other financial account issues. " +
        "other: anything that does not clearly fit the categories above. " +
        "Pick the single best-fitting category.",
      prompt: `Subject: ${ticket_subject}\n\nBody: ${ticket_body}`,
    })

    res.json(object)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI request failed"
    res.status(502).json({ error: message })
  }
})

export default router

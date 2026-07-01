import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

const categorySchema = z.object({
  category: z.enum(["technical_it", "billing_fees", "other"]),
})

export type Category = z.infer<typeof categorySchema>["category"]

export async function classifyCategory(ticketSubject: string, ticketBody: string): Promise<Category> {
  const { object } = await generateObject({
    model: openai("gpt-5-nano"),
    schema: categorySchema,
    system:
      "You classify student support tickets into exactly one category. " +
      "technical_it: IT/technical issues such as login problems, software, hardware, or systems access. " +
      "billing_fees: billing, payments, fees, refunds, or other financial account issues. " +
      "other: anything that does not clearly fit the categories above. " +
      "Pick the single best-fitting category.",
    prompt: `Subject: ${ticketSubject}\n\nBody: ${ticketBody}`,
  })

  return object.category
}

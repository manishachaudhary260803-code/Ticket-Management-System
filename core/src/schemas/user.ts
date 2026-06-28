import { z } from "zod"

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(3, "Email must be at least 3 characters").email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["agent", "admin"]),
})

export type CreateUserInput = z.input<typeof createUserSchema>
export type CreateUserOutput = z.output<typeof createUserSchema>

export const editUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(3, "Email must be at least 3 characters").email("Invalid email"),
  // Empty string means "leave password unchanged"; non-empty must be >= 8 chars
  password: z.union([z.string().min(8, "Password must be at least 8 characters"), z.literal("")]),
  role: z.enum(["agent", "admin"]),
})

export type EditUserInput = z.input<typeof editUserSchema>
export type EditUserOutput = z.output<typeof editUserSchema>


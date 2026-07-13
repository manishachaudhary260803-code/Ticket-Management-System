import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { authClient } from "@/lib/auth-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

const DEMO_CREDENTIALS = { email: "enjay@example.com", password: "Enjay@123" }

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const [isDemoLoading, setIsDemoLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function signIn(data: FormData) {
    const { error } = await authClient.signIn.email(data)

    if (error) {
      setError("root", { message: error.message ?? "Sign in failed. Please try again." })
      return
    }

    navigate("/")
  }

  async function handleDemoLogin() {
    setIsDemoLoading(true)
    await signIn(DEMO_CREDENTIALS)
    setIsDemoLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-t-2 border-t-brass">
        <CardHeader>
          <CardTitle className="italic text-2xl text-ink">Sign in</CardTitle>
          <CardDescription className="text-ink-muted">Ticket Management System</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="mb-4 w-full border-sage text-sage hover:bg-sage-tint"
            size="lg"
            disabled={isDemoLoading || isSubmitting}
            onClick={handleDemoLogin}
          >
            {isDemoLoading ? "Signing in…" : "Try demo account"}
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-ink-muted uppercase">or sign in manually</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(signIn)} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-maroon">{errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-maroon">{errors.password.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="text-sm text-maroon bg-maroon-tint px-3 py-2 rounded-lg">
                {errors.root.message}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className="mt-1 w-full" size="lg">
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

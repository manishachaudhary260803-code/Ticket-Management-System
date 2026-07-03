import React from "react"

type Variant = "default" | "sage" | "brass"

const variantCls: Record<Variant, { section: string; label: string }> = {
  default: { section: "bg-card border-border",      label: "text-ink-muted" },
  sage:    { section: "bg-sage-tint border-sage/20", label: "text-sage"      },
  brass:   { section: "bg-brass-tint border-brass/25", label: "text-brass-dark" },
}

export function DetailSection({
  label,
  variant = "default",
  className = "",
  children,
}: {
  label: React.ReactNode
  variant?: Variant
  className?: string
  children: React.ReactNode
}) {
  const { section, label: labelCls } = variantCls[variant]
  return (
    <section className={`rounded-lg border px-6 py-5 ${section} ${className}`}>
      <p className={`section-label mb-3 ${labelCls}`}>{label}</p>
      {children}
    </section>
  )
}

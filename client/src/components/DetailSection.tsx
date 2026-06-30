import React from "react"

type Variant = "default" | "blue" | "amber"

const variantCls: Record<Variant, { section: string; label: string }> = {
  default: { section: "bg-white border-gray-200",   label: "text-gray-500"  },
  blue:    { section: "bg-blue-50 border-blue-100",  label: "text-blue-700"  },
  amber:   { section: "bg-amber-50 border-amber-100", label: "text-amber-700" },
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

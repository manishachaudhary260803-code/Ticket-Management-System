// Used in TicketDetail's sidebar, where a single colored pill per field is fine.
export const priorityStyles: Record<string, string> = {
  low: "bg-secondary text-ink-muted",
  medium: "bg-brass-tint text-brass-dark",
  high: "bg-maroon-tint text-maroon",
}

// Used in the ticket table, where the same field is repeated down every row —
// a small dot is enough of a signal; text stays neutral so the row doesn't
// turn into a wall of colored pills.
export const statusDotColor: Record<string, string> = {
  open: "bg-brass",
  in_progress: "bg-navy",
  resolved: "bg-sage",
}

export const priorityTextStyle: Record<string, string> = {
  low: "text-ink-muted",
  medium: "text-ink",
  high: "text-maroon font-semibold",
}

export const categoryLabels: Record<string, string> = {
  technical_it: "Technical / IT",
  billing_fees: "Billing / Fees",
  other: "Other",
}

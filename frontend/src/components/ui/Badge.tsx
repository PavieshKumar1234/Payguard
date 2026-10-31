// Badges render on two very different surfaces: the dark navy glass cards and
// the white "light-card" / light-canvas sections. A single translucent tint
// cannot stay readable on both, so each surface gets its own palette while
// keeping the exact same meaning (green = approved, amber = review,
// red = blocked, cyan = PayPal/info, violet = AI signals).
//
// Dark surface: bright 300-level text on a dark hue-tinted chip. The fill is
// intentionally dark (950-level) because the glass cards are semi-transparent
// over a light canvas - a translucent bright fill would let the light page
// bleed through and drop the text below 4.5:1. Bright text + dark chip keeps
// the vivid status colour and a comfortable ~7-8:1 contrast anywhere on the
// card. Light surface: deep 800-level ink on a pale 50-level fill.
// All combinations clear WCAG AA (>= 4.5:1) for normal-sized text.

const darkStyles: Record<string, string> = {
  approved: 'bg-emerald-950/60 text-emerald-300 border-emerald-400/40',
  approve: 'bg-emerald-950/60 text-emerald-300 border-emerald-400/40',
  review: 'bg-amber-950/60 text-amber-300 border-amber-400/40',
  review_required: 'bg-amber-950/60 text-amber-300 border-amber-400/40',
  blocked: 'bg-red-950/60 text-red-300 border-red-400/40',
  block: 'bg-red-950/60 text-red-300 border-red-400/40',
  info: 'bg-sky-950/60 text-sky-300 border-sky-400/40',
  cyan: 'bg-cyan-950/60 text-cyan-300 border-cyan-400/40',
  violet: 'bg-violet-950/60 text-violet-300 border-violet-400/40',
}

const lightStyles: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  approve: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  review: 'bg-amber-50 text-amber-800 border-amber-200',
  review_required: 'bg-amber-50 text-amber-800 border-amber-200',
  blocked: 'bg-red-50 text-red-800 border-red-200',
  block: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  cyan: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  violet: 'bg-violet-50 text-violet-800 border-violet-200',
}

export default function Badge({
  label,
  tone = 'info',
  surface = 'dark',
}: {
  label: string
  tone?: string
  surface?: 'dark' | 'light'
}) {
  const key = tone.toLowerCase()
  const styles = surface === 'light' ? lightStyles : darkStyles
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${styles[key] ?? styles.info}`}>
      {label}
    </span>
  )
}

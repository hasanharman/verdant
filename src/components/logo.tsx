import { points, polyFace, tint, type V3 } from "@/lib/iso"
import { cn } from "@/lib/utils"

// A tiny gable glasshouse.
const L = 16
const W = 12
const E = 8
const R = 13
const parts: { ps: V3[]; out: V3; glass?: boolean }[] = [
  { ps: [[0, 0, E], [L, 0, E], [L, W / 2, R], [0, W / 2, R]], out: [0, -1, 1] },
  { ps: [[0, W, 0], [L, W, 0], [L, W, E], [0, W, E]], out: [0, 1, 0], glass: true },
  { ps: [[L, 0, 0], [L, W, 0], [L, W, E], [L, W / 2, R], [L, 0, E]], out: [1, 0, 0], glass: true },
  { ps: [[0, W, E], [L, W, E], [L, W / 2, R], [0, W / 2, R]], out: [0, 1, 1] },
]
const faces = parts.map((p) => {
  const f = polyFace(p.ps, p.out)
  return { pts: points(f.pts), l: f.light, glass: p.glass }
})

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="-12 -11 27 26" className={cn("h-7 w-auto", className)} aria-hidden>
      {faces.map((f, i) => (
        <polygon
          key={i}
          points={f.pts}
          fill={f.glass ? "var(--signal)" : tint("var(--face)", f.l)}
          fillOpacity={f.glass ? 0.4 : 1}
          stroke="var(--ink)"
          strokeWidth={1}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}

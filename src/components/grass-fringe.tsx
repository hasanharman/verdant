// Grass blades along the hero's bottom edge, swaying in three out-of-step groups.
const WIDTH = 1600
const HEIGHT = 44

const blades = Array.from({ length: 260 }, (_, i) => {
  const r = (n: number) => {
    const s = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453
    return s - Math.floor(s)
  }
  const x = (i / 260) * WIDTH + r(1) * 6
  const h = 14 + r(2) * 26
  const lean = (r(3) - 0.5) * 12
  const w = 1.6 + r(4) * 1.6
  return { group: i % 3, d: `M${(x - w).toFixed(1)} ${HEIGHT}Q${(x + lean * 0.3).toFixed(1)} ${(HEIGHT - h * 0.6).toFixed(1)} ${(x + lean).toFixed(1)} ${(HEIGHT - h).toFixed(1)}Q${(x + lean * 0.3 + w).toFixed(1)} ${(HEIGHT - h * 0.5).toFixed(1)} ${(x + w).toFixed(1)} ${HEIGHT}Z` }
})

const paths = [0, 1, 2].map((g) =>
  blades
    .filter((b) => b.group === g)
    .map((b) => b.d)
    .join("")
)

export function GrassFringe({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      className={className}
    >
      {paths.map((d, g) => (
        <path
          key={g}
          d={d}
          fill="var(--tuft-strong)"
          fillOpacity={0.55 + g * 0.2}
          className="motion-safe:animate-[sway_3.6s_ease-in-out_infinite_alternate]"
          style={{ transformOrigin: "50% 100%", transformBox: "fill-box", animationDelay: `${g * -1.2}s` }}
        />
      ))}
    </svg>
  )
}

"use client"

import { animate, useInView, useMotionValue, useMotionValueEvent, useReducedMotion } from "motion/react"
import { useEffect, useId, useRef, useState } from "react"

import { fitBoxes, IsoBox } from "@/components/iso/iso-box"
import { HatchPattern, SceneShapes } from "@/components/greenhouse/greenhouse-drawing"
import { buildScene, RIDGE } from "@/components/greenhouse/scene"
import { points, project, type V3 } from "@/lib/iso"

const houses: { bays: number; at: V3 }[] = [
  { bays: 5, at: [0, 0, 0] },
  { bays: 3, at: [250, 0, 0] },
]
const rows = [140, 166, 192]
const trees: V3[] = [
  [-4, 150, 0],
  [-10, 196, 0],
  [392, 132, 0],
]

function Tree({ at }: { at: V3 }) {
  const base = project(at)
  const top = project([at[0], at[1], at[2] + 26])
  const blob = Array.from({ length: 16 }, (_, k) => {
    const a = (k / 16) * Math.PI * 2
    return [top[0] + Math.cos(a) * 13, top[1] + Math.sin(a) * 12] as const
  })
  return (
    <g>
      <line x1={base[0]} y1={base[1]} x2={top[0]} y2={top[1]} stroke="var(--ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <polygon
        points={points(blob)}
        fill="color-mix(in oklab, var(--leaf) 70%, var(--shade))"
        stroke="var(--ink)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  )
}

export function IsoFarm() {
  const hatchId = `hatch-${useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  const [hot, setHot] = useState<number | null>(null)

  const growthMv = useMotionValue(0)
  const [growth, setGrowth] = useState(0)
  useMotionValueEvent(growthMv, "change", setGrowth)
  useEffect(() => {
    if (!inView) return
    const controls = animate(growthMv, 1, reduce ? { duration: 0 } : { duration: 2.2, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [inView, reduce, growthMv])

  const viewBox = fitBoxes([[[-24, -14, -4], [404, 222, RIDGE + 4]]], [], 4)

  return (
    <svg ref={ref} viewBox={viewBox} role="img" aria-label="Isometric plot with two greenhouses and crop rows" className="size-full overflow-visible">
      <defs>
        <HatchPattern id={hatchId} />
      </defs>
      <IsoBox a={[-24, -14, -4]} b={[404, 222, 0]} mat="grass" />
      <IsoBox a={[208, -14, -0.5]} b={[238, 124, 0.4]} mat="concrete" />
      {houses.map((h, i) => {
        const [dx, dy] = project(h.at)
        const scene = buildScene({
          bays: h.bays,
          explode: 0,
          open: i === 0 ? 0.6 : 0,
          growth,
          fruit: growth > 0.9,
          shine: 0,
          stagger: false,
          glint: false,
          flutes: i === 1,
        })
        return (
          <g
            key={i}
            transform={`translate(${dx.toFixed(2)} ${dy.toFixed(2)})`}
            onPointerEnter={() => setHot(i)}
            onPointerLeave={() => setHot(null)}
            className="cursor-crosshair"
          >
            <SceneShapes scene={scene} glazing={i === 1 ? "poly" : "clear"} frame="auto" all={hot === i} hatchId={hatchId} />
          </g>
        )
      })}
      {rows.map((y) => (
        <g key={y}>
          <IsoBox a={[20, y, 0]} b={[370, y + 12, 3]} mat="wood" />
          {growth > 0.05 &&
            Array.from({ length: 25 }, (_, k) => {
              const [cx, cy] = project([30 + k * 14, y + 6, 3 + 5 * growth])
              const r = 1.5 + 3.5 * growth
              return (
                <ellipse
                  key={k}
                  cx={cx.toFixed(2)}
                  cy={cy.toFixed(2)}
                  rx={r.toFixed(2)}
                  ry={(r * 0.85).toFixed(2)}
                  fill="color-mix(in oklab, var(--leaf) 85%, var(--shade))"
                  stroke="var(--ink)"
                  strokeWidth={0.7}
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
        </g>
      ))}
      {trees.map((t) => (
        <Tree key={t.join()} at={t} />
      ))}
    </svg>
  )
}

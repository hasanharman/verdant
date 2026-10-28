"use client"

import { animate, useInView, useMotionValue, useReducedMotion } from "motion/react"
import { useEffect, useId, useMemo, useRef, useState } from "react"

import { fitBoxes, IsoBox } from "@/components/iso/iso-box"
import { SceneDefs, sceneIds, SceneShapes } from "@/components/greenhouse/greenhouse-drawing"
import { buildScene, RIDGE } from "@/components/greenhouse/scene"
import { useMotionState } from "@/hooks/use-motion-state"
import { points, project, tint, type V3 } from "@/lib/iso"

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

const TREE_FILL = tint("var(--leaf)", 0.7)
const CROP_FILL = tint("var(--leaf)", 0.85)
const treeShapes = trees.map((at) => {
  const base = project(at)
  const top = project([at[0], at[1], at[2] + 26])
  const blob = Array.from({ length: 16 }, (_, k) => {
    const a = (k / 16) * Math.PI * 2
    return [top[0] + Math.cos(a) * 13, top[1] + Math.sin(a) * 12] as const
  })
  return { key: at.join(), base, top, blob: points(blob) }
})

export function IsoFarm() {
  const { hatchId, glowId } = sceneIds(useId())
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  const [hot, setHot] = useState<number | null>(null)

  const growthMv = useMotionValue(0)
  const growth = useMotionState(growthMv)
  useEffect(() => {
    if (!inView) return
    const controls = animate(growthMv, 1, reduce ? { duration: 0 } : { duration: 2.2, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [inView, reduce, growthMv])

  const viewBox = fitBoxes([[[-24, -14, -4], [404, 222, RIDGE + 4]]], [], 4)
  const scenes = useMemo(
    () =>
      houses.map((h, i) =>
        buildScene({
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
      ),
    [growth]
  )

  return (
    <svg ref={ref} viewBox={viewBox} role="img" aria-label="Isometric plot with two greenhouses and crop rows" className="size-full overflow-visible">
      <defs>
        <SceneDefs hatchId={hatchId} glowId={glowId} />
      </defs>
      <IsoBox a={[-24, -14, -4]} b={[404, 222, 0]} mat="grass" />
      <IsoBox a={[208, -14, -0.5]} b={[238, 124, 0.4]} mat="concrete" />
      {houses.map((h, i) => {
        const [dx, dy] = project(h.at)
        return (
          <g
            key={i}
            transform={`translate(${dx.toFixed(2)} ${dy.toFixed(2)})`}
            onPointerEnter={() => setHot(i)}
            onPointerLeave={() => setHot(null)}
            className="cursor-crosshair"
          >
            <SceneShapes scene={scenes[i]} glazing={i === 1 ? "poly" : "clear"} all={hot === i} hatchId={hatchId} glowId={glowId} />
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
                  fill={CROP_FILL}
                  stroke="var(--ink)"
                  strokeWidth={0.7}
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
        </g>
      ))}
      {treeShapes.map((t) => (
        <g key={t.key}>
          <line x1={t.base[0]} y1={t.base[1]} x2={t.top[0]} y2={t.top[1]} stroke="var(--ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <polygon points={t.blob} fill={TREE_FILL} stroke="var(--ink)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </g>
      ))}
    </svg>
  )
}

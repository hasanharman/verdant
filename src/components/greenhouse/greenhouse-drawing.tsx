"use client"

import { useId, useMemo, type Ref } from "react"

import { clamp01, COS30, grow, lerp, points, SIN30, tint, type Bounds } from "@/lib/iso"
import { cn } from "@/lib/utils"
import { buildScene, PARTS, type PartKind, type Scene, type Shape } from "./scene"

export type GlazingKey = "clear" | "diffuse" | "poly" | "tinted"
export type FrameColor = "silver" | "graphite" | "moss" | "white"

export const GLAZING: Record<GlazingKey, { label: string; color: string; opacity: number; glint: boolean; flutes?: boolean }> = {
  clear: { label: "Clear glass", color: "oklch(0.84 0.07 200)", opacity: 0.2, glint: true },
  diffuse: { label: "Diffuse glass", color: "oklch(0.97 0.006 160)", opacity: 0.5, glint: false },
  poly: { label: "Polycarbonate", color: "oklch(0.95 0.012 220)", opacity: 0.42, glint: false, flutes: true },
  tinted: { label: "Shade glass", color: "oklch(0.62 0.05 150)", opacity: 0.38, glint: true },
}

export const FRAME: Record<FrameColor, { label: string; color: string }> = {
  silver: { label: "Silver", color: "oklch(0.86 0.006 250)" },
  graphite: { label: "Graphite", color: "oklch(0.38 0.008 255)" },
  moss: { label: "Moss green", color: "oklch(0.42 0.06 150)" },
  white: { label: "White", color: "oklch(0.975 0.004 85)" },
}

const FONT = 7
const LABEL_GAP = 13
const COLUMN = 16
const textWidth = (s: string, size = FONT) => s.length * size * 0.62
const widest = (side: "left" | "right") =>
  Math.max(...Object.values(PARTS).filter((p) => p.side === side).map((p) => textWidth(`${p.no}  ${p.name}`)))
const LEFT_TEXT = widest("left")
const RIGHT_TEXT = widest("right")
const r2 = (v: number) => Math.round(v * 100) / 100
const padBounds = (b: Bounds, p: number): Bounds => ({
  minX: r2(b.minX - p),
  minY: r2(b.minY - p),
  maxX: r2(b.maxX + p),
  maxY: r2(b.maxY + p),
})

const DIM_TRANSFORM = {
  top: (x: number, y: number) => `matrix(${COS30} ${SIN30} ${-COS30} ${SIN30} ${x} ${y})`,
  "ground-y": (x: number, y: number) => `matrix(${COS30} ${-SIN30} ${COS30} ${SIN30} ${x} ${y})`,
  side: (x: number, y: number) => `matrix(0 -1 ${COS30} ${SIN30} ${x} ${y})`,
}

type Look = { glazing: GlazingKey; frame?: FrameColor; active?: PartKind | null; all?: boolean; hatchId: string; glowId: string }

/** Paints a built scene. Shared by the main drawing and the farm illustration. */
export function SceneShapes({ scene, glazing, frame, active, all, hatchId, glowId }: { scene: Scene } & Look) {
  const g = GLAZING[glazing]
  const frameColor = frame ? FRAME[frame].color : "var(--face)"

  const fillFor = (s: Shape, on: boolean): { fill: string; fillOpacity?: number } => {
    const l = s.light ?? 0.8
    const mix = (base: string, light = l) => {
      const c = tint(base, light)
      return on ? `color-mix(in oklab, ${c} 62%, var(--signal))` : c
    }
    switch (s.mat) {
      case "frame":
        return { fill: mix(frameColor) }
      case "steel":
        return { fill: mix("var(--steel)") }
      case "concrete":
        return { fill: mix("var(--concrete)") }
      case "wood":
        return { fill: mix("var(--wood)") }
      case "soil":
        return { fill: mix("var(--soil)", 0.9) }
      case "leaf":
        return { fill: mix("var(--leaf)") }
      case "lamp":
        return { fill: mix("var(--lamp-body)", 1) }
      case "floor":
        return { fill: "var(--floor)" }
      case "fruit":
        return { fill: "var(--fruit)" }
      case "hole":
        return { fill: "var(--shade)", fillOpacity: 0.55 }
      case "glint":
        return { fill: "var(--glint)", fillOpacity: 0.6 }
      case "cone":
        return { fill: "var(--lamp-cone)" }
      case "glow":
        return { fill: `url(#${glowId})` }
      case "glass":
        return on
          ? { fill: "var(--signal)", fillOpacity: 0.22 }
          : {
              fill: `color-mix(in oklab, ${g.color}, var(--lamp) var(--lamp-mix))`,
              fillOpacity: s.hidden ? g.opacity * 0.6 : g.opacity * (0.85 + (1 - l) * 0.5),
            }
    }
  }

  return (
    <>
      {scene.shapes.map((s, i) => {
        const on = (all || active === s.kind) && s.mat !== "glow" && s.mat !== "cone"
        if (s.line) {
          const tone = s.tone === "water" ? "var(--water)" : s.tone === "leaf" ? tint("var(--leaf)", 0.55) : "var(--ink)"
          return (
            <polyline
              key={i}
              points={points(s.pts)}
              fill="none"
              stroke={on && !s.tone ? "var(--signal)" : tone}
              strokeOpacity={s.hidden ? 0.35 : s.tone ? 1 : 0.6}
              strokeWidth={s.width ?? 0.75}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )
        }
        const { fill, fillOpacity } = fillFor(s, on)
        const p = points(s.pts)
        const stroke = on ? "var(--signal)" : "var(--ink)"
        return (
          <g key={i}>
            <polygon
              points={p}
              fill={fill}
              fillOpacity={fillOpacity}
              stroke={s.noStroke || s.mat === "hole" ? "none" : stroke}
              strokeOpacity={s.hidden ? 0.35 : s.mat === "glass" ? 0.85 : 1}
              strokeWidth={on ? 1.5 : (s.width ?? (s.mat === "leaf" || s.mat === "fruit" ? 0.7 : 1))}
              strokeLinejoin="round"
              strokeDasharray={s.hidden ? "3 2.5" : s.dashed ? "5 3" : undefined}
              vectorEffect="non-scaling-stroke"
            />
            {s.hatch && <polygon points={p} fill={`url(#${hatchId})`} stroke="none" />}
          </g>
        )
      })}
    </>
  )
}

/** Hatch for section cuts and the radial glow the lamps throw at night. */
export function SceneDefs({ hatchId, glowId }: { hatchId: string; glowId: string }) {
  return (
    <>
      <pattern id={hatchId} width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="3.2" stroke="var(--ink)" strokeOpacity="0.28" strokeWidth="0.45" />
      </pattern>
      <radialGradient id={glowId}>
        <stop offset="0%" style={{ stopColor: "var(--lamp-glow)" }} />
        <stop offset="100%" style={{ stopColor: "var(--lamp-glow)", stopOpacity: 0 }} />
      </radialGradient>
    </>
  )
}

export const sceneIds = (uid: string) => {
  const clean = uid.replace(/[^a-zA-Z0-9]/g, "")
  return { hatchId: `hatch-${clean}`, glowId: `glow-${clean}` }
}

type Props = {
  bays?: number
  glazing?: GlazingKey
  frame?: FrameColor
  explode?: number
  open?: number
  growth?: number
  fruit?: boolean
  shine?: number
  stagger?: boolean
  labels?: "text" | "number" | "none"
  labelOpacity?: (kind: PartKind) => number
  active?: PartKind | null
  dims?: boolean
  camera?: boolean
  svgRef?: Ref<SVGSVGElement>
  className?: string
  title?: string
}

export function GreenhouseDrawing({
  bays = 4,
  glazing = "clear",
  frame,
  explode = 0,
  open = 0,
  growth = 1,
  fruit = false,
  shine = 0,
  stagger = false,
  labels = "text",
  labelOpacity,
  active = null,
  dims = false,
  camera = false,
  svgRef,
  className,
  title = "Isometric exploded drawing of a glass greenhouse",
}: Props) {
  const { hatchId, glowId } = sceneIds(useId())
  const g = GLAZING[glazing]

  // Fixed reference frame (fully exploded, everything open) so the viewBox never jumps.
  const frameRef = useMemo(() => {
    const base = { bays, open: 1, growth: 1, fruit: false, shine: 0, stagger: false, glint: false, flutes: false }
    const exploded = buildScene({ ...base, explode: 1 })
    const b = { ...exploded.bounds }
    let vb = { ...b }
    const left = b.minX - COLUMN
    const right = b.maxX + COLUMN
    if (labels === "text") {
      vb.minX = left - LEFT_TEXT - 6
      vb.maxX = right + RIGHT_TEXT + 6
    } else if (labels === "number") {
      vb = padBounds(vb, 20)
    }
    if (dims) {
      const assembled = buildScene({ ...base, explode: 0 })
      for (const d of assembled.dims) grow(vb, [...d.line, ...d.ext.flat()].map(([x, y]) => [x + 10, y + 10] as const))
    }
    return { vb: padBounds(vb, 10), left, right }
  }, [bays, labels, dims])

  const { glint, flutes = false } = g
  const scene = useMemo(
    () => buildScene({ bays, explode, open, growth, fruit, shine, stagger, glint, flutes }),
    [bays, explode, open, growth, fruit, shine, stagger, glint, flutes]
  )
  const { vb } = frameRef
  const left = r2(camera ? scene.bounds.minX - COLUMN : frameRef.left)
  const right = r2(camera ? scene.bounds.maxX + COLUMN : frameRef.right)

  const placed = (() => {
    if (labels === "none") return []
    const rows = scene.anchors
      .map((a) => ({ ...a, side: PARTS[a.kind].side, op: labelOpacity ? clamp01(labelOpacity(a.kind)) : 1 }))
      .filter((a) => a.op > 0.01)
    const out: ((typeof rows)[number] & { y: number })[] = []
    for (const side of ["left", "right"] as const) {
      let prev = -Infinity
      for (const r of rows.filter((r) => r.side === side).sort((a, b) => a.at[1] - b.at[1])) {
        const y = r2(Math.max(r.at[1], prev + LABEL_GAP))
        prev = y
        out.push({ ...r, y })
      }
    }
    return out
  })()

  const dimsOpacity = dims ? 1 - clamp01(explode / 0.16) : 0

  let cameraTransform: string | undefined
  if (camera) {
    const cb: Bounds = { ...scene.bounds }
    if (dimsOpacity > 0) for (const d of scene.dims) grow(cb, [...d.line, ...d.ext.flat()])
    if (labels !== "none") {
      const reach = (side: "left" | "right") =>
        clamp01(4 * Math.max(0, ...placed.filter((p) => p.side === side).map((p) => p.op)))
      if (labels === "text") {
        cb.minX = lerp(cb.minX, left - LEFT_TEXT - 6, reach("left"))
        cb.maxX = lerp(cb.maxX, right + RIGHT_TEXT + 6, reach("right"))
      } else {
        cb.minX -= 22 * reach("left")
        cb.maxX += 22 * reach("right")
        cb.minY -= 16 * Math.max(reach("left"), reach("right"))
      }
      for (const p of placed) grow(cb, [[cb.minX, p.y - 6], [cb.minX, p.y + 6]])
    }
    const w = vb.maxX - vb.minX
    const h = vb.maxY - vb.minY
    const s = Math.min(2.1, Math.max(1, Math.min(w / (cb.maxX - cb.minX + 24), h / (cb.maxY - cb.minY + 24))))
    const cx = (cb.minX + cb.maxX) / 2
    const cy = (cb.minY + cb.maxY) / 2
    cameraTransform = `translate(${r2(vb.minX + w / 2)} ${r2(vb.minY + h / 2)}) scale(${s.toFixed(4)}) translate(${r2(-cx)} ${r2(-cy)})`
  }

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label={title}
      viewBox={`${vb.minX} ${vb.minY} ${vb.maxX - vb.minX} ${vb.maxY - vb.minY}`}
      className={cn("block size-full select-none", className)}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <SceneDefs hatchId={hatchId} glowId={glowId} />
      </defs>
      <g transform={cameraTransform}>
        <SceneShapes scene={scene} glazing={glazing} frame={frame} active={active} hatchId={hatchId} glowId={glowId} />

        {dimsOpacity > 0 &&
          scene.dims.map((d, i) => (
            <g key={i} opacity={dimsOpacity} stroke="var(--ink)" strokeWidth={0.75} fill="none">
              {d.ext.map((e, j) => (
                <polyline key={j} points={points(e)} strokeOpacity={0.5} vectorEffect="non-scaling-stroke" />
              ))}
              <polyline points={points(d.line)} vectorEffect="non-scaling-stroke" />
              {d.ticks.map((t, j) => (
                <polyline key={j} points={points(t)} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
              ))}
              <text
                transform={DIM_TRANSFORM[d.plane](d.at[0], d.at[1])}
                textAnchor="middle"
                fontSize={6.5}
                fill="var(--ink)"
                stroke="none"
                style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}
              >
                {d.text}
              </text>
            </g>
          ))}

        {labels === "text" &&
          placed.map((l) => {
            const isLeft = l.side === "left"
            const col = isLeft ? left : right
            const [ax, ay] = l.at
            const elbowX = r2(isLeft ? Math.max(col, ax - 8) : Math.min(col, ax + 8))
            const on = active === l.kind
            return (
              <g key={l.kind} opacity={l.op}>
                <circle cx={ax} cy={ay} r={1.4} fill={on ? "var(--signal)" : "var(--ink)"} />
                <polyline
                  points={`${ax},${ay} ${elbowX},${l.y} ${col},${l.y}`}
                  fill="none"
                  stroke={on ? "var(--signal)" : "var(--ink)"}
                  strokeWidth={0.75}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={isLeft ? col - 3 : col + 3}
                  y={l.y}
                  dominantBaseline="middle"
                  textAnchor={isLeft ? "end" : "start"}
                  fontSize={FONT}
                  fontWeight={on ? 600 : 400}
                  style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
                >
                  <tspan fill="var(--signal)">{PARTS[l.kind].no}</tspan>
                  <tspan dx={4} fill="var(--ink)">
                    {PARTS[l.kind].name.toUpperCase()}
                  </tspan>
                </text>
              </g>
            )
          })}

        {labels === "number" &&
          placed.map((l) => {
            const isLeft = l.side === "left"
            const [ax, ay] = l.at
            const bx = r2(ax + (isLeft ? -15 : 15))
            const by = r2(l.y - 9)
            const on = active === l.kind
            return (
              <g key={l.kind} opacity={l.op}>
                <circle cx={ax} cy={ay} r={1.3} fill="var(--ink)" />
                <line x1={ax} y1={ay} x2={bx} y2={by} stroke="var(--ink)" strokeWidth={0.75} vectorEffect="non-scaling-stroke" />
                <circle
                  cx={bx}
                  cy={by}
                  r={5.6}
                  fill={on ? "var(--signal)" : "var(--background)"}
                  stroke={on ? "var(--signal)" : "var(--ink)"}
                  strokeWidth={0.9}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={bx}
                  y={by}
                  dominantBaseline="central"
                  textAnchor="middle"
                  fontSize={5.4}
                  fontWeight={600}
                  fill={on ? "var(--background)" : "var(--ink)"}
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {PARTS[l.kind].no}
                </text>
              </g>
            )
          })}
      </g>
    </svg>
  )
}

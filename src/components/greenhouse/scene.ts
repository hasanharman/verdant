import {
  beamFaces,
  boxFaces,
  circle,
  emptyBounds,
  grow,
  IDENTITY,
  light,
  polyFace,
  project,
  range,
  type Bounds,
  type V2,
  type V3,
} from "@/lib/iso"

/** Bay length, clear span, eave and ridge height in drawing units. */
export const BAY = 40
export const SPAN = 100
export const EAVE = 68
export const RIDGE = 95
/** One drawing unit in millimetres (40 units → 1.6 m bay). */
export const MM = 40

export type PartKind =
  | "ridge"
  | "vent"
  | "roof"
  | "gutter"
  | "frame"
  | "walls"
  | "door"
  | "irrigation"
  | "beds"
  | "foundation"

export type PartMeta = { no: string; name: string; spec: string; side: "left" | "right" }

export const PART_ORDER: PartKind[] = [
  "ridge",
  "vent",
  "roof",
  "gutter",
  "frame",
  "walls",
  "door",
  "irrigation",
  "beds",
  "foundation",
]

export const PARTS: Record<PartKind, PartMeta> = {
  ridge: {
    no: "01",
    name: "Ridge cap",
    spec: "Aluminium capping that seals the apex and ties both roof slopes together.",
    side: "right",
  },
  vent: {
    no: "02",
    name: "Roof vents",
    spec: "Ridge-hinged vents with automatic openers. They lift as the house warms up, no power needed.",
    side: "left",
  },
  roof: {
    no: "03",
    name: "Roof glazing",
    spec: "Toughened glass or twin-wall polycarbonate, clipped in with rubber gaskets.",
    side: "right",
  },
  gutter: {
    no: "04",
    name: "Gutters & downpipe",
    spec: "Integrated gutters on both eaves. Point the downpipe at a water butt and save rainwater.",
    side: "left",
  },
  frame: {
    no: "05",
    name: "Aluminium frame",
    spec: "Powder-coated gable frames, bolted bay by bay. No rust, no repainting.",
    side: "right",
  },
  walls: {
    no: "06",
    name: "Side & gable glazing",
    spec: "Full-height panes from the base sill to the eave, for light right down to the soil.",
    side: "left",
  },
  door: {
    no: "07",
    name: "Sliding door",
    spec: "Wide, level-threshold sliding door. Wheelbarrows roll straight in.",
    side: "right",
  },
  irrigation: {
    no: "08",
    name: "Drip irrigation",
    spec: "Drip line along every bed, ready for a timer. Water goes to the roots, not the paths.",
    side: "right",
  },
  beds: {
    no: "09",
    name: "Raised beds",
    spec: "Timber-edged raised beds at a comfortable working height, sized to your crop.",
    side: "left",
  },
  foundation: {
    no: "10",
    name: "Strip foundation",
    spec: "Level concrete strip footing, so the frame stays square through every season.",
    side: "left",
  },
}

const STAGGER_START = 0.04
const STAGGER_STEP = 0.07
const STAGE_DELAY = 0.1

export function staggered(kind: PartKind, t: number) {
  const start = STAGGER_START + PART_ORDER.indexOf(kind) * STAGGER_STEP
  return range(t, start, start + 0.3)
}

export function activeAt(t: number): PartKind | null {
  const u = t - STAGGER_START - STAGE_DELAY
  if (u < 0) return null
  return PART_ORDER[Math.min(PART_ORDER.length - 1, Math.floor(u / STAGGER_STEP))]
}

export function stageOf(kind: PartKind) {
  return STAGGER_START + STAGE_DELAY + (PART_ORDER.indexOf(kind) + 0.5) * STAGGER_STEP
}

export type Material =
  | "frame"
  | "glass"
  | "glint"
  | "concrete"
  | "wood"
  | "soil"
  | "floor"
  | "leaf"
  | "fruit"
  | "hole"
  | "steel"
  | "lamp"
  | "cone"
  | "glow"

export type Shape = {
  kind: PartKind
  mat: Material
  pts: V2[]
  light?: number
  line?: boolean
  /** Stroke colour for lines; faces always use ink. */
  tone?: "ink" | "water" | "leaf"
  width?: number
  dashed?: boolean
  hatch?: boolean
  /** Back-facing glass: drawn with faint dashed edges, like hidden lines. */
  hidden?: boolean
  noStroke?: boolean
}

export type Anchor = { kind: PartKind; at: V2 }
export type Dim = { ext: V2[][]; line: V2[]; ticks: V2[][]; text: string; at: V2; plane: "top" | "side" | "ground-y" }
export type Scene = { shapes: Shape[]; anchors: Anchor[]; dims: Dim[]; bounds: Bounds }

export type SceneInput = {
  bays: number
  explode: number
  /** 0 → vents and door shut, 1 → fully open. */
  open: number
  /** 0 → empty beds, 1 → fully grown. */
  growth: number
  fruit: boolean
  shine: number
  stagger: boolean
  glint: boolean
  flutes: boolean
}

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (v: V3, k: number): V3 => [v[0] * k, v[1] * k, v[2] * k]
const formatMm = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} mm`
// Stable pseudo-random jitter so plants don't look stamped.
const jitter = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

export function buildScene(input: SceneInput): Scene {
  const { bays: n, explode, open, growth, fruit, shine, stagger, glint, flutes } = input
  const L = n * BAY
  const MID = SPAN / 2
  const shapes: Shape[] = []
  const anchors: Anchor[] = []

  const prog = (k: PartKind) => (stagger ? staggered(k, explode) : range(explode, 0, 1))
  const move = (k: PartKind, v: V3) => scale(v, prog(k))

  const box = (kind: PartKind, mat: Material, a: V3, b: V3, o: V3, extra?: Partial<Shape>) => {
    for (const f of boxFaces(a, b, IDENTITY, o)) shapes.push({ kind, mat, pts: f.pts, light: light(f.normal), ...extra })
  }
  const beam = (kind: PartKind, a: V3, b: V3, size: number, o: V3) => {
    for (const f of beamFaces(a, b, size, o)) shapes.push({ kind, mat: "frame", pts: f.pts, light: f.light })
  }
  const line = (kind: PartKind, ps: V3[], o: V3, extra?: Partial<Shape>) =>
    shapes.push({ kind, mat: "frame", line: true, pts: ps.map((p) => project(add(p, o))), ...extra })
  const flat = (ps: V3[], o: V3 = [0, 0, 0]) => ps.map((p) => project(add(p, o)))
  /** Screen-space ellipse around a world point; filled with a radial glow at night. */
  const glow = (c: V3, rx: number, ry: number) => {
    const [cx, cy] = project(c)
    const pts: V2[] = []
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry])
    }
    shapes.push({ kind: "frame", mat: "glow", pts, noStroke: true })
  }
  // Rounded so server and browser floating point agree during hydration.
  const anchor = (kind: PartKind, p: V3, o: V3) => {
    const [x, y] = project(add(p, o))
    anchors.push({ kind, at: [Math.round(x * 100) / 100, Math.round(y * 100) / 100] })
  }

  /** A pane of glazing; back-facing panes read as hidden lines. */
  const pane = (kind: PartKind, ps: V3[], outward: V3, o: V3, fluteDir?: V3) => {
    const f = polyFace(ps, outward, o)
    shapes.push({ kind, mat: "glass", pts: f.pts, light: f.light, hidden: !f.visible })
    if (!f.visible) return
    if (flutes && fluteDir) {
      // Twin-wall polycarbonate: fine parallel flutes across the pane.
      const [a, b, , d] = ps
      const across: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
      const steps = Math.max(3, Math.round(Math.hypot(...across) / 4))
      for (let s = 1; s < steps; s++) {
        const p0 = add(a, scale(across, s / steps))
        const p1 = add(d, scale(across, s / steps))
        shapes.push({ kind, mat: "frame", line: true, pts: [project(add(p0, o)), project(add(p1, o))], width: 0.5, hidden: true })
      }
    } else if (glint) {
      // Two reflection strokes, nudged by the pointer.
      const [a, b, c, d] = ps
      const lerp3 = (p: V3, q: V3, t: number): V3 => add(p, scale([q[0] - p[0], q[1] - p[1], q[2] - p[2]], t))
      for (const [t, len] of [[0.55, 0.3], [0.68, 0.18]] as const) {
        const tt = Math.min(0.9, Math.max(0.1, t + shine * 0.12))
        const top = lerp3(d, c, tt)
        const bot = lerp3(a, b, tt - 0.25 > 0.05 ? tt - 0.25 : 0.05)
        line(kind, [lerp3(bot, top, 0.55 - len / 2), lerp3(bot, top, 0.55 + len / 2)], o, { width: 0.6 })
      }
    }
  }

  // Light spilling onto the ground around the house (only visible at night)
  glow([L / 2, MID, 0], (L + SPAN) * 0.62, (L + SPAN) * 0.3)

  // 10 — strip foundation
  const oF = move("foundation", [0, 0, -36])
  {
    const strips: [V3, V3][] = [
      [[-4, -4, -12], [L + 4, 4, 0]],
      [[-4, 4, -12], [4, SPAN - 4, 0]],
      [[L - 4, 4, -12], [L + 4, SPAN - 4, 0]],
      [[-4, SPAN - 4, -12], [L + 4, SPAN + 4, 0]],
    ]
    for (const [a, b] of strips)
      for (const f of boxFaces(a, b, IDENTITY, oF))
        shapes.push({ kind: "foundation", mat: "concrete", pts: f.pts, light: light(f.normal), hatch: f.side !== "top" })
    anchor("foundation", [2, SPAN + 4, -6], oF)
  }

  // Back glazing (seen through the front): back wall and the far gable
  const oW = prog("walls")
  const outBack: V3 = [0, -34 * oW, 0]
  const outFar: V3 = [-34 * oW, 0, 0]
  for (let i = 0; i < n; i++) {
    const x0 = i * BAY
    const x1 = x0 + BAY
    pane("walls", [[x0, 0, 4], [x1, 0, 4], [x1, 0, EAVE], [x0, 0, EAVE]], [0, -1, 0], outBack, [0, 0, 1])
  }
  pane("walls", [[0, 0, 4], [0, MID, 4], [0, MID, RIDGE], [0, 0, EAVE]], [-1, 0, 0], outFar)
  pane("walls", [[0, MID, 4], [0, SPAN, 4], [0, SPAN, EAVE], [0, MID, RIDGE]], [-1, 0, 0], outFar)

  // Back gutter and the back roof slope
  const oGb = move("gutter", [0, -26, 14])
  box("gutter", "frame", [-3, -5.5, EAVE - 5], [L + 3, -0.5, EAVE - 1], oGb)
  const oRb = move("roof", [0, -10, 46])
  for (let i = 0; i < n; i++) {
    const x0 = i * BAY
    const x1 = x0 + BAY
    pane("roof", [[x0, 0, EAVE], [x1, 0, EAVE], [x1, MID, RIDGE], [x0, MID, RIDGE]], [0, -(RIDGE - EAVE), MID], oRb, [0, 1, (RIDGE - EAVE) / MID])
  }
  anchor("roof", [L - 12, MID * 0.3, EAVE + (RIDGE - EAVE) * 0.3], oRb)

  // Frame, back half
  const oX: V3 = [0, 0, 0]
  const post = (x: number, y: number) => box("frame", "frame", [x - 1.1, y - 1.1, 4], [x + 1.1, y + 1.1, EAVE], oX)
  box("frame", "frame", [-1.2, -1.2, 0], [L + 1.2, 1.2, 4], oX)
  box("frame", "frame", [-1.2, 1.2, 0], [1.2, SPAN - 1.2, 4], oX)
  for (let i = 0; i <= n; i++) {
    post(i * BAY, 0)
    beam("frame", [i * BAY, 0, EAVE], [i * BAY, MID, RIDGE], 2.2, oX)
  }
  box("frame", "frame", [-1.1, -1.1, EAVE - 2.2], [L + 1.1, 1.1, EAVE], oX)
  beam("frame", [0, MID, RIDGE], [L, MID, RIDGE], 2.4, oX)

  // Interior glow, behind the beds and lamps
  glow([L / 2, MID, EAVE * 0.55], (L + SPAN) * 0.5, (L + SPAN) * 0.36)

  // Floor and the beds, seen through the glass
  shapes.push({
    kind: "beds",
    mat: "floor",
    noStroke: true,
    pts: flat([[1, 1, 0.2], [L - 1, 1, 0.2], [L - 1, SPAN - 1, 0.2], [1, SPAN - 1, 0.2]]),
  })
  const oI = move("irrigation", [0, 0, 16])
  const beds: [number, number][] = [
    [14, 40],
    [60, 86],
  ]
  let plantNo = 0
  for (const [y0, y1] of beds) {
    box("beds", "wood", [10, y0, 0], [L - 10, y1, 12], oX)
    shapes.push({
      kind: "beds",
      mat: "soil",
      pts: flat([[11.5, y0 + 1.5, 12], [L - 11.5, y0 + 1.5, 12], [L - 11.5, y1 - 1.5, 12], [11.5, y1 - 1.5, 12]]),
    })
    // Drip line down the bed centre, emitters every 12 units
    const yc = (y0 + y1) / 2
    line("irrigation", [[12, yc, 12.8], [L - 12, yc, 12.8]], oI, { tone: "water", width: 1.6 })
    for (let x = 18; x < L - 12; x += 12)
      shapes.push({ kind: "irrigation", mat: "hole", pts: circle([x, yc, 12.8], 0.9, "xy", IDENTITY, oI, 8), noStroke: true })

    if (growth > 0.01) {
      const plants: { x: number; y: number; i: number }[] = []
      for (const y of [y0 + 7, y1 - 7]) for (let x = 17; x < L - 14; x += 11) plants.push({ x, y, i: plantNo++ })
      plants.sort((a, b) => a.x + a.y - (b.x + b.y))
      for (const p of plants) {
        const j = jitter(p.i)
        const h = (5 + 13 * growth) * (0.8 + 0.4 * j)
        const r = (1.4 + 4.6 * growth) * (0.85 + 0.3 * jitter(p.i + 7))
        const base = project([p.x, p.y, 12])
        const top = project([p.x, p.y, 12 + h])
        shapes.push({ kind: "beds", mat: "leaf", line: true, pts: [base, top], tone: "leaf", width: 1.2 })
        const blob: V2[] = []
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * Math.PI * 2
          const wob = 1 + 0.12 * Math.sin(a * 3 + p.i)
          blob.push([top[0] + Math.cos(a) * r * wob, top[1] + Math.sin(a) * r * 0.86 * wob])
        }
        shapes.push({ kind: "beds", mat: "leaf", pts: blob, light: 0.7 + 0.3 * j })
        if (fruit && growth > 0.8)
          for (let k = 0; k < 3; k++) {
            const a = j * 6 + k * 2.1
            const c: V2 = [top[0] + Math.cos(a) * r * 0.55, top[1] + Math.sin(a) * r * 0.45 + 0.5]
            const dot: V2[] = []
            for (let m = 0; m < 8; m++) dot.push([c[0] + Math.cos((m / 8) * Math.PI * 2) * 1.15, c[1] + Math.sin((m / 8) * Math.PI * 2) * 1.15])
            shapes.push({ kind: "beds", mat: "fruit", pts: dot })
          }
      }
    }
  }
  line("irrigation", [[L - 12, 27, 12.8], [L - 12, 73, 12.8]], oI, { tone: "water", width: 1.6 })
  anchor("irrigation", [L - 12, 50, 12.8], oI)
  anchor("beds", [11, 86, 6], oX)

  // Hanging lamps, one per bay, with a cone of light onto the beds
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * BAY
    const zl = RIDGE - 16
    line("frame", [[x, MID, RIDGE], [x, MID, zl + 2]], oX, { width: 0.7 })
    shapes.push({
      kind: "frame",
      mat: "cone",
      noStroke: true,
      pts: flat([[x - 3.5, MID, zl], [x + 3.5, MID, zl], [x + 14, MID, 13], [x - 14, MID, 13]]),
    })
    for (const f of boxFaces([x - 4, MID - 2, zl], [x + 4, MID + 2, zl + 2], IDENTITY, oX))
      shapes.push({ kind: "frame", mat: "lamp", pts: f.pts, light: light(f.normal) })
  }

  // Frame, front half
  box("frame", "frame", [L - 1.2, 1.2, 0], [L + 1.2, SPAN - 1.2, 4], oX)
  box("frame", "frame", [-1.2, SPAN - 1.2, 0], [L + 1.2, SPAN + 1.2, 4], oX)
  for (let i = 0; i <= n; i++) {
    beam("frame", [i * BAY, SPAN, EAVE], [i * BAY, MID, RIDGE], 2.2, oX)
    post(i * BAY, SPAN)
  }
  box("frame", "frame", [-1.1, SPAN - 1.1, EAVE - 2.2], [L + 1.1, SPAN + 1.1, EAVE], oX)
  anchor("frame", [L, 0, EAVE * 0.55], oX)

  // Front glazing: long wall and the near gable
  const outFront: V3 = [0, 34 * oW, 0]
  const outNear: V3 = [34 * oW, 0, 0]
  for (let i = 0; i < n; i++) {
    const x0 = i * BAY
    pane("walls", [[x0, SPAN, 4], [x0 + BAY, SPAN, 4], [x0 + BAY, SPAN, EAVE], [x0, SPAN, EAVE]], [0, 1, 0], outFront, [0, 0, 1])
  }
  pane("walls", [[L, 0, 4], [L, MID, 4], [L, MID, RIDGE], [L, 0, EAVE]], [1, 0, 0], outNear, [0, 0, 1])
  pane("walls", [[L, MID, 4], [L, SPAN, 4], [L, SPAN, EAVE], [L, MID, RIDGE]], [1, 0, 0], outNear, [0, 0, 1])
  anchor("walls", [8, SPAN, EAVE * 0.45], outFront)

  // 07 — sliding door on the near gable
  {
    const oD = add(outNear, move("door", [26, 0, 0]))
    const w = 13
    box("door", "frame", [L, MID - w - 2, 4], [L + 2, MID - w, 66], oD)
    box("door", "frame", [L, MID + w, 4], [L + 2, MID + w + 2, 66], oD)
    box("door", "frame", [L, MID - w - 2, 64], [L + 2, MID + w + 2, 67], oD)
    const slide = -open * (2 * w - 4)
    const y0 = MID - w + slide
    pane("door", [[L + 2.4, y0, 4], [L + 2.4, y0 + 2 * w, 4], [L + 2.4, y0 + 2 * w, 64], [L + 2.4, y0, 64]], [1, 0, 0], oD)
    box("door", "steel", [L + 2.4, y0 + 2 * w - 4, 30], [L + 3.6, y0 + 2 * w - 2.6, 40], oD)
    anchor("door", [L + 3, y0 + 2 * w - 3, 35], oD)
  }

  // 03 — front roof slope, then the vents on top of it
  const oRf = move("roof", [0, 10, 46])
  for (let i = 0; i < n; i++) {
    const x0 = i * BAY
    pane("roof", [[x0, SPAN, EAVE], [x0 + BAY, SPAN, EAVE], [x0 + BAY, MID, RIDGE], [x0, MID, RIDGE]], [0, RIDGE - EAVE, MID], oRf, [0, -1, (RIDGE - EAVE) / MID])
  }

  {
    const oV = add(oRf, move("vent", [0, 0, 26]))
    const run = MID
    const rise = RIDGE - EAVE
    const alpha = Math.atan2(rise, run)
    const len = Math.hypot(run, rise) * 0.42
    const phi = open * (alpha + 0.32)
    const dir: V3 = [0, Math.cos(alpha - phi), -Math.sin(alpha - phi)]
    const up: V3 = [0, Math.sin(alpha - phi), Math.cos(alpha - phi)]
    for (let i = 0; i < n; i += 2) {
      const x0 = i * BAY + 4
      const x1 = (i + 1) * BAY - 4
      const h0: V3 = [x0, MID + 0.5, RIDGE + 0.8]
      const h1: V3 = [x1, MID + 0.5, RIDGE + 0.8]
      const l0 = add(h0, scale(dir, len))
      const l1 = add(h1, scale(dir, len))
      const ps = [h0, h1, l1, l0]
      const f = polyFace(ps, up, oV)
      shapes.push({ kind: "vent", mat: "glass", pts: f.pts, light: f.light, width: 1.6 })
      // Automatic opener arm from the roof to the vent's lower edge
      if (open > 0.02) {
        const mid = (x0 + x1) / 2
        const onRoof: V3 = [mid, MID + run * 0.5, RIDGE - rise * 0.5 + 0.5]
        line("vent", [onRoof, add([mid, 0, 0], [0, l0[1], l0[2]])], oV, { width: 1.2 })
      }
      if (i === 0) anchor("vent", [x0 + 4, (h0[1] + l0[1]) / 2, (h0[2] + l0[2]) / 2], oV)
    }
  }

  // 04 — front gutter and downpipe
  const oGf = move("gutter", [0, 26, 14])
  box("gutter", "frame", [-3, SPAN + 0.5, EAVE - 5], [L + 3, SPAN + 5.5, EAVE - 1], oGf)
  shapes.push({
    kind: "gutter",
    mat: "hole",
    pts: flat([[-3, SPAN + 1.5, EAVE - 1], [L + 3, SPAN + 1.5, EAVE - 1], [L + 3, SPAN + 4.5, EAVE - 1], [-3, SPAN + 4.5, EAVE - 1]], oGf),
  })
  box("gutter", "frame", [L - 1, SPAN + 1.5, 0], [L + 2, SPAN + 4.5, EAVE - 5], oGf)
  anchor("gutter", [6, SPAN + 5.5, EAVE - 3], oGf)

  // 01 — ridge cap
  const oC = move("ridge", [0, 0, 84])
  beam("ridge", [-2, MID, RIDGE + 1.6], [L + 2, MID, RIDGE + 1.6], 3.6, oC)
  anchor("ridge", [L - 8, MID, RIDGE + 3.4], oC)

  // Dimensions: length along the front, span along the near gable, ridge height
  const dims: Dim[] = []
  {
    const z = -12
    const yd = SPAN + 20
    dims.push({
      ext: [
        [project([0, SPAN + 5, z]), project([0, yd + 2.5, z])],
        [project([L, SPAN + 5, z]), project([L, yd + 2.5, z])],
      ],
      line: [project([0, yd, z]), project([L, yd, z])],
      ticks: [0, L].map((x) => [project([x - 1.8, yd - 1.8, z]), project([x + 1.8, yd + 1.8, z])]),
      text: formatMm(L * MM),
      at: project([L / 2, yd + 2.6, z]),
      plane: "top",
    })
    const xd = L + 20
    dims.push({
      ext: [
        [project([L + 5, 0, z]), project([xd + 2.5, 0, z])],
        [project([L + 5, SPAN, z]), project([xd + 2.5, SPAN, z])],
      ],
      line: [project([xd, 0, z]), project([xd, SPAN, z])],
      ticks: [0, SPAN].map((y) => [project([xd - 1.8, y - 1.8, z]), project([xd + 1.8, y + 1.8, z])]),
      text: formatMm(SPAN * MM),
      at: project([xd + 2.6, MID, z]),
      plane: "ground-y",
    })
    const xh = L + 34
    dims.push({
      ext: [
        [project([L + 5, 0, 0]), project([xh + 2.5, 0, 0])],
        [project([L + 3, 0, EAVE]), project([xh + 2.5, 0, EAVE])],
      ],
      line: [project([xh, 0, 0]), project([xh, 0, EAVE])],
      ticks: [0, EAVE].map((zz) => [project([xh - 1.8, 0, zz - 1.8]), project([xh + 1.8, 0, zz + 1.8])]),
      text: formatMm(EAVE * MM),
      at: project([xh + 2.6, 0, EAVE / 2]),
      plane: "side",
    })
  }

  const bounds = emptyBounds()
  // Glow pools spill past the house; leave them out so the camera frames the structure.
  for (const s of shapes) if (s.mat !== "glow") grow(bounds, s.pts)
  return { shapes, anchors, dims, bounds }
}

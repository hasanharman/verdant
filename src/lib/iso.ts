// Isometric helpers: +x down-right, +y down-left, +z up, viewed from (+1, +1, +1).

export type V3 = readonly [number, number, number]
export type V2 = readonly [number, number]

export const COS30 = Math.cos(Math.PI / 6)
export const SIN30 = 0.5

export function project([x, y, z]: V3): V2 {
  return [(x - y) * COS30, (x + y) * SIN30 - z]
}

export function points(ps: readonly V2[]) {
  let out = ""
  for (const [x, y] of ps) out += `${x.toFixed(2)},${y.toFixed(2)} `
  return out.trimEnd()
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
/** Eased progress of `t` through the window [a, b]. */
export const range = (t: number, a: number, b: number) =>
  easeInOut(clamp01((t - a) / (b - a)))

const add = (p: V3, o: V3 = [0, 0, 0]): V3 => [p[0] + o[0], p[1] + o[1], p[2] + o[2]]

/** A face is visible when its normal points toward the viewer. */
const facesViewer = (n: V3) => n[0] + n[1] + n[2] > 1e-6

const LIGHT: V3 = (() => {
  const l: V3 = [-0.4, 0.65, 1]
  const m = Math.hypot(...l)
  return [l[0] / m, l[1] / m, l[2] / m]
})()

/** 0..1 lambert-ish brightness for a world-space normal. */
export function light(n: V3) {
  const d = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]
  return clamp01(0.64 + 0.36 * d)
}

/** `color` darkened toward --shade by brightness `l`. */
export const tint = (color: string, l: number) => `color-mix(in oklab, ${color} ${Math.round(l * 100)}%, var(--shade))`

type BoxFace = { pts: V2[]; normal: V3; side: "top" | "x" | "y" | "-x" | "-y" }

/** Visible faces of an axis-aligned box, shifted by `offset`. */
export function boxFaces(a: V3, b: V3, offset?: V3): BoxFace[] {
  const [x0, y0, z0] = a
  const [x1, y1, z1] = b
  const P = (x: number, y: number, z: number) => project(add([x, y, z], offset))
  const faces: { side: BoxFace["side"]; n: V3; q: () => V2[] }[] = [
    { side: "-x", n: [-1, 0, 0], q: () => [P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)] },
    { side: "-y", n: [0, -1, 0], q: () => [P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)] },
    { side: "x", n: [1, 0, 0], q: () => [P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)] },
    { side: "y", n: [0, 1, 0], q: () => [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)] },
    { side: "top", n: [0, 0, 1], q: () => [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)] },
  ]
  return faces.filter((f) => facesViewer(f.n)).map((f) => ({ pts: f.q(), normal: f.n, side: f.side }))
}

/** Horizontal circle, returned as projected points. */
export function circle(c: V3, r: number, offset?: V3, segments = 24): V2[] {
  const out: V2[] = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    out.push(project(add([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, c[2]], offset)))
  }
  return out
}

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number }
export const emptyBounds = (): Bounds => ({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity })
export function grow(b: Bounds, pts: readonly V2[]) {
  for (const [x, y] of pts) {
    if (x < b.minX) b.minX = x
    if (x > b.maxX) b.maxX = x
    if (y < b.minY) b.minY = y
    if (y > b.maxY) b.maxY = y
  }
  return b
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const unit = (a: V3): V3 => {
  const m = Math.hypot(...a) || 1
  return [a[0] / m, a[1] / m, a[2] / m]
}

/** Any planar polygon in world space; the normal is flipped to agree with `outward`. */
export function polyFace(ps: V3[], outward: V3, offset: V3 = [0, 0, 0]) {
  const world = ps.map((p) => add(p, offset))
  let n = unit(cross(sub(world[1], world[0]), sub(world[2], world[0])))
  if (dot(n, outward) < 0) n = [-n[0], -n[1], -n[2]]
  return { pts: world.map(project), normal: n, visible: facesViewer(n), light: light(n) }
}

/** Square-section member between two points (rafters, ridge beams). */
export function beamFaces(a: V3, b: V3, size: number, offset?: V3) {
  const d = unit(sub(b, a))
  const up: V3 = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]
  const u = unit(cross(d, up))
  const v = cross(u, d)
  const h = size / 2
  const at = (p: V3, su: number, sv: number): V3 => [
    p[0] + (u[0] * su + v[0] * sv) * h,
    p[1] + (u[1] * su + v[1] * sv) * h,
    p[2] + (u[2] * su + v[2] * sv) * h,
  ]
  const neg = (x: V3): V3 => [-x[0], -x[1], -x[2]]
  const sides: [V3[], V3][] = [
    [[at(a, 1, -1), at(b, 1, -1), at(b, 1, 1), at(a, 1, 1)], u],
    [[at(a, -1, -1), at(b, -1, -1), at(b, -1, 1), at(a, -1, 1)], neg(u)],
    [[at(a, -1, 1), at(b, -1, 1), at(b, 1, 1), at(a, 1, 1)], v],
    [[at(a, -1, -1), at(b, -1, -1), at(b, 1, -1), at(a, 1, -1)], neg(v)],
    [[at(a, -1, -1), at(a, 1, -1), at(a, 1, 1), at(a, -1, 1)], neg(d)],
    [[at(b, -1, -1), at(b, 1, -1), at(b, 1, 1), at(b, -1, 1)], d],
  ]
  return sides.map(([ps, n]) => polyFace(ps, n, offset)).filter((f) => f.visible)
}

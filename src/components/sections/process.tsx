"use client"

import { motion, useReducedMotion, type Transition } from "motion/react"
import { useId, type ReactNode } from "react"

import { fitBoxes, HatchDef, IsoBeam, IsoBox, IsoLine, IsoQuad } from "@/components/iso/iso-box"
import { points, project, type V3 } from "@/lib/iso"
import { process } from "@/lib/site"
import { Section, SectionHeader } from "./section"

const loop: Transition = { duration: 2.4, repeat: Infinity, repeatType: "mirror", repeatDelay: 0.9, ease: [0.65, 0, 0.35, 1] }

/** Screen-space offset for a world-space move. */
const shift = (d: V3) => {
  const [x, y] = project(d)
  return { x, y }
}

function Scene({ viewBox, label, children }: { viewBox: string; label: string; children: ReactNode }) {
  return (
    <svg viewBox={viewBox} role="img" aria-label={label} className="size-full overflow-visible">
      {children}
    </svg>
  )
}

/** Starts displaced by `from` and settles into place, on a loop while in view. */
function Settle({ from, children }: { from: V3; children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.g
      initial={shift(reduce ? [0, 0, 0] : from)}
      whileInView={shift([0, 0, 0])}
      viewport={{ amount: 0.5 }}
      transition={reduce ? { duration: 0 } : loop}
    >
      {children}
    </motion.g>
  )
}

// A small gable greenhouse skeleton: posts, rafters, eaves and ridge.
const SPAN = 60
const EAVE = 38
const RIDGE = 56
function GableFrame({ x }: { x: number }) {
  return (
    <>
      <IsoBeam a={[x, 0, 0]} b={[x, 0, EAVE]} />
      <IsoBeam a={[x, 0, EAVE]} b={[x, SPAN / 2, RIDGE]} />
      <IsoBeam a={[x, SPAN, EAVE]} b={[x, SPAN / 2, RIDGE]} />
      <IsoBeam a={[x, SPAN, 0]} b={[x, SPAN, EAVE]} />
    </>
  )
}
function Runners({ length }: { length: number }) {
  return (
    <>
      <IsoBeam a={[0, 0, EAVE]} b={[length, 0, EAVE]} />
      <IsoBeam a={[0, SPAN / 2, RIDGE]} b={[length, SPAN / 2, RIDGE]} />
      <IsoBeam a={[0, SPAN, EAVE]} b={[length, SPAN, EAVE]} />
    </>
  )
}

function SurveyScene() {
  const reduce = useReducedMotion()
  const stakes: [number, number][] = [
    [15, 12],
    [95, 12],
    [95, 72],
    [15, 72],
  ]
  const string = [...stakes, stakes[0]].map(([x, y]) => project([x, y, 7]))
  return (
    <Scene viewBox={fitBoxes([[[-10, -10, -4], [130, 104, 28]]])} label="Surveying a plot with stakes and a level">
      <IsoBox a={[-10, -10, -4]} b={[118, 92, 0]} mat="grass" />
      {stakes.map(([x, y]) => (
        <IsoBox key={`${x}-${y}`} a={[x - 1, y - 1, 0]} b={[x + 1, y + 1, 10]} mat="wood" />
      ))}
      <motion.polyline
        points={points(string)}
        fill="none"
        stroke="var(--signal)"
        strokeWidth={1.4}
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: reduce ? 1 : 0 }}
        whileInView={reduce ? undefined : { pathLength: 1 }}
        viewport={{ amount: 0.5 }}
        transition={loop}
      />
      <IsoLine pts={[[112, 88, 25], [95, 72, 9]]} signal dashed />
      <IsoLine pts={[[112, 98, 0], [112, 90, 22]]} width={1.2} />
      <IsoLine pts={[[118, 84, 0], [112, 90, 22]]} width={1.2} />
      <IsoLine pts={[[104, 86, 0], [112, 90, 22]]} width={1.2} />
      <IsoBox a={[109, 86, 22]} b={[115, 92, 28]} mat="dark" />
    </Scene>
  )
}

function FoundationScene() {
  const hatch = `hatch-${useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const strips: [V3, V3][] = [
    [[0, 0, -10], [80, 6, -4]],
    [[0, 6, -10], [6, 54, -4]],
    [[74, 6, -10], [80, 54, -4]],
    [[0, 54, -10], [80, 60, -4]],
  ]
  return (
    <Scene viewBox={fitBoxes([[[-14, -14, -10], [94, 74, 10]]])} label="Concrete strip footing rising out of the ground">
      <HatchDef id={hatch} />
      <IsoBox a={[-14, -14, -6]} b={[94, 74, -2]} mat="grass" />
      <Settle from={[0, 0, -4]}>
        <g transform={`translate(${project([0, 0, 6]).join(" ")})`}>
          {strips.map(([a, b], i) => (
            <IsoBox key={i} a={a} b={b} mat="concrete" hatch={hatch} />
          ))}
        </g>
      </Settle>
      <IsoLine pts={[[-8, 60, 4], [88, 60, 4]]} signal dashed />
      <IsoLine pts={[[80, -8, 4], [80, 68, 4]]} signal dashed />
    </Scene>
  )
}

function FrameScene() {
  return (
    <Scene viewBox={fitBoxes([[[0, 0, 0], [80, 60, RIDGE]]], [[80, 30, RIDGE + 34]])} label="Aluminium gable frames being bolted together">
      <IsoBox a={[-2, -2, -4]} b={[82, 62, 0]} mat="concrete" />
      <GableFrame x={0} />
      <GableFrame x={40} />
      <Runners length={80} />
      <Settle from={[0, 0, 30]}>
        <GableFrame x={80} />
      </Settle>
    </Scene>
  )
}

function GlazeScene() {
  const pane = (x0: number, x1: number): V3[] => [
    [x0, SPAN, EAVE],
    [x1, SPAN, EAVE],
    [x1, SPAN / 2, RIDGE],
    [x0, SPAN / 2, RIDGE],
  ]
  return (
    <Scene viewBox={fitBoxes([[[0, 0, 0], [80, 60, RIDGE]]], [[60, 45, RIDGE + 40]])} label="A glass pane being lowered onto the roof">
      <IsoBox a={[-2, -2, -4]} b={[82, 62, 0]} mat="concrete" />
      <GableFrame x={0} />
      <GableFrame x={40} />
      <GableFrame x={80} />
      <Runners length={80} />
      <IsoQuad pts={[[0, SPAN, 0], [40, SPAN, 0], [40, SPAN, EAVE], [0, SPAN, EAVE]]} out={[0, 1, 0]} />
      <IsoQuad pts={[[40, SPAN, 0], [80, SPAN, 0], [80, SPAN, EAVE], [40, SPAN, EAVE]]} out={[0, 1, 0]} />
      <IsoQuad pts={pane(0, 40)} out={[0, 1, 1]} />
      <Settle from={[0, 0, 26]}>
        <IsoQuad pts={pane(40, 80)} out={[0, 1, 1]} />
        <IsoLine pts={[[60, 45, RIDGE - 9 + 2], [60, 45, RIDGE + 40]]} />
        <IsoBox a={[56, 41, RIDGE - 9 + 2]} b={[64, 49, RIDGE - 9 + 4]} mat="dark" />
      </Settle>
    </Scene>
  )
}

const scenes = [SurveyScene, FoundationScene, FrameScene, GlazeScene]

export function Process() {
  return (
    <Section id="process">
      <SectionHeader
        index="02"
        eyebrow="Process"
        title="From bare ground to first harvest,"
        accent="one team."
        lede="We don't drop off a kit and leave. The same crew surveys your plot, pours the footing, raises the frame and glazes it."
      />
      <ol className="mt-14 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {process.map((step, i) => {
          const Art = scenes[i]
          return (
            <li key={step.no} className="flex flex-col bg-background p-5 sm:p-6">
              <div className="bg-drafting relative aspect-[5/4] rounded-md border">
                <div className="absolute inset-0 p-8">
                  <Art />
                </div>
                <span className="text-label absolute top-2.5 left-3 text-muted-foreground">Fig. {step.no}</span>
              </div>
              <div className="mt-6 flex items-baseline justify-between">
                <span className="text-label text-signal">{step.no}</span>
                <span className="text-label text-muted-foreground">{step.note}</span>
              </div>
              <h3 className="mt-2 text-2xl font-medium tracking-tight">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">{step.body}</p>
            </li>
          )
        })}
      </ol>
    </Section>
  )
}

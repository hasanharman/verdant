"use client"

import { ArrowDownIcon, ArrowRightIcon } from "lucide-react"
import {
  animate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react"
import { useEffect, useRef, useState, type PointerEvent } from "react"

import { GrassFringe } from "@/components/grass-fringe"
import { GreenhouseDrawing } from "@/components/greenhouse/greenhouse-drawing"
import { activeAt, PART_ORDER, PARTS, stageOf, staggered, type PartKind } from "@/components/greenhouse/scene"
import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/use-media-query"
import { clamp01, lerp, range } from "@/lib/iso"
import { site } from "@/lib/site"
import { cn } from "@/lib/utils"

/** Scroll progress is mapped to explode over the first 90% so the end holds still. */
const HOLD = 0.9

export function HeroTeardown() {
  const sectionRef = useRef<HTMLElement>(null)
  const coordsRef = useRef<HTMLSpanElement>(null)
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const reduce = useReducedMotion()

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] })
  const smooth = useSpring(scrollYProgress, { stiffness: 160, damping: 30, mass: 0.35 })
  const [t, setT] = useState(0)
  useMotionValueEvent(smooth, "change", setT)

  // Intro: the crop grows in, then the roof vents lift as the house "warms up".
  const growthMv = useMotionValue(0)
  const [growth, setGrowth] = useState(0)
  useMotionValueEvent(growthMv, "change", setGrowth)
  const openMv = useMotionValue(0)
  const [open, setOpen] = useState(0)
  useMotionValueEvent(openMv, "change", setOpen)
  useEffect(() => {
    const grow = animate(growthMv, 1, reduce ? { duration: 0 } : { duration: 2.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] })
    const vents = animate(openMv, 0.7, reduce ? { duration: 0 } : { duration: 1.6, delay: 1.9, ease: [0.65, 0, 0.35, 1] })
    return () => {
      grow.stop()
      vents.stop()
    }
  }, [reduce, growthMv, openMv])

  // Pointer drags the reflections across the glass.
  const shineMv = useSpring(0, { stiffness: 50, damping: 18 })
  const [shine, setShine] = useState(0)
  useMotionValueEvent(shineMv, "change", setShine)
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    shineMv.set(((e.clientX - r.left) / r.width) * 2 - 1)
    if (coordsRef.current) {
      const x = String(Math.round(e.clientX - r.left)).padStart(4, "0")
      const y = String(Math.round(e.clientY - r.top)).padStart(4, "0")
      coordsRef.current.textContent = `X ${x} · Y ${y}`
    }
  }

  const [hover, setHover] = useState<PartKind | null>(null)
  const explode = clamp01(t / HOLD)
  const scrollActive = activeAt(explode)
  const active = hover ?? scrollActive
  const labelOpacity = (k: PartKind) => clamp01((staggered(k, explode) - 0.2) / 0.35)

  const intro = 1 - range(t, 0.015, 0.09)
  const legend = range(t, 0.05, 0.12)

  const jumpTo = (k: PartKind) => {
    const el = sectionRef.current
    if (!el) return
    const target = stageOf(k) * HOLD
    const top = el.offsetTop + target * (el.offsetHeight - window.innerHeight)
    window.scrollTo({ top, behavior: "smooth" })
  }

  return (
    <section ref={sectionRef} id="top" className="relative h-[480vh]" aria-label="Exploded view of the greenhouse structure">
      <div
        className="bg-meadow sticky top-0 flex h-svh flex-col overflow-hidden"
        onPointerMove={onPointerMove}
      >
        <GrassFringe className="pointer-events-none absolute inset-x-0 bottom-11 h-11 w-full" />
        <div className="relative mx-auto grid min-h-0 w-full max-w-[1440px] flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] px-4 pt-14 sm:px-6 lg:grid-cols-12 lg:px-10">
          {/* Copy, then the parts legend takes its place */}
          <div className="pointer-events-none relative z-10 flex flex-col justify-start pt-8 lg:col-span-5 lg:justify-center lg:pt-0 xl:col-span-4">
            <div
              className="pointer-events-auto flex flex-col gap-5 sm:gap-6"
              style={{
                opacity: intro,
                transform: `translateY(${(1 - intro) * -24}px)`,
                visibility: intro < 0.01 ? "hidden" : "visible",
              }}
            >
              <p className="text-label flex items-center gap-2 text-muted-foreground">
                <span className="inline-block size-1.5 rounded-full bg-signal" />
                {site.system} · Aluminium & glass gable greenhouse
              </p>
              <h1 className="max-w-[12ch] text-[2.75rem] leading-[0.95] font-medium tracking-[-0.045em] text-balance sm:text-6xl xl:text-7xl">
                Built for what <span className="font-serif font-normal tracking-[-0.02em] italic">grows</span> inside.
              </h1>
              <p className="max-w-[44ch] text-[0.95rem] leading-relaxed text-pretty text-muted-foreground sm:text-base">
                Glass greenhouses sized to your plot, from a backyard hobby house to a long growing bay. Surveyed,
                founded, framed and glazed by one team. <span className="text-foreground">Scroll to take one apart.</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="lg" render={<a href="#contact" />} nativeButton={false}>
                  Get a quote
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
                <Button size="lg" variant="outline" render={<a href="#configure" />} nativeButton={false}>
                  Configure yours
                </Button>
              </div>
              <dl className="hidden max-w-md grid-cols-3 border-t pt-4 sm:grid">
                {[
                  ["4 m", "Clear span"],
                  ["Auto", "Roof vents"],
                  ["Any", "Length, by the bay"],
                ].map(([v, k]) => (
                  <div key={k} className="flex flex-col gap-1">
                    <dt className="text-label text-muted-foreground">{k}</dt>
                    <dd className="text-xl font-medium tracking-tight">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {isDesktop && (
              <div
                className="pointer-events-auto absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col gap-4"
                style={{ opacity: legend, visibility: legend < 0.01 ? "hidden" : "visible" }}
              >
                <div className="flex items-baseline justify-between">
                  <p className="text-label text-muted-foreground">Schedule of parts</p>
                  <p className="text-label text-muted-foreground tabular-nums">
                    {String(Math.max(1, PART_ORDER.indexOf(active ?? "ridge") + 1)).padStart(2, "0")} / 10
                  </p>
                </div>
                <ol className="flex flex-col border-b" onMouseLeave={() => setHover(null)}>
                  {PART_ORDER.map((k) => {
                    const on = active === k
                    return (
                      <li key={k}>
                        <button
                          type="button"
                          onMouseEnter={() => setHover(k)}
                          onFocus={() => setHover(k)}
                          onBlur={() => setHover(null)}
                          onClick={() => jumpTo(k)}
                          className={cn(
                            "grid w-full grid-cols-[2.25rem_1fr] items-baseline border-t py-2 text-left transition-colors duration-200 outline-none focus-visible:bg-muted",
                            on ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <span className={cn("text-label", on ? "text-signal" : "")}>{PARTS[k].no}</span>
                          <span className="text-sm font-medium">{PARTS[k].name}</span>
                          <span
                            className={cn(
                              "col-start-2 grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                              on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                            )}
                          >
                            <span className="overflow-hidden text-[0.8rem] leading-snug text-muted-foreground">
                              <span className="block pt-1">{PARTS[k].spec}</span>
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}
          </div>

          {/* The drawing */}
          <div
            className="absolute inset-x-0 bottom-0 lg:relative lg:col-span-7 lg:h-full lg:min-h-0 lg:pl-6 xl:col-span-8"
            style={isDesktop ? undefined : { top: `${lerp(52, 12, range(t, 0.01, 0.1))}%` }}
          >
            <GreenhouseDrawing
              camera
              stagger
              explode={explode}
              open={open}
              growth={growth}
              fruit
              shine={shine}
              labels={isDesktop ? "text" : "number"}
              labelOpacity={labelOpacity}
              active={explode > 0.03 ? active : null}
              className="lg:py-4"
            />
          </div>
        </div>

        {/* Mobile caption for the part on stage */}
        {!isDesktop && (
          <div
            className="pointer-events-none absolute inset-x-3 bottom-14 rounded-lg border bg-background/85 p-3 backdrop-blur-sm transition-opacity duration-300"
            style={{ opacity: scrollActive && legend > 0.5 ? 1 : 0 }}
            aria-live="polite"
          >
            {scrollActive && (
              <div className="grid grid-cols-[2rem_1fr] gap-y-0.5">
                <span className="text-label text-signal">{PARTS[scrollActive].no}</span>
                <span className="text-sm font-medium">{PARTS[scrollActive].name}</span>
                <span className="col-start-2 text-xs leading-snug text-muted-foreground">{PARTS[scrollActive].spec}</span>
              </div>
            )}
          </div>
        )}

        {/* Drawing sheet strip */}
        <div className="relative border-t bg-background/70 backdrop-blur-sm">
          <div className="mx-auto flex h-11 max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-10">
            <span className="text-label hidden text-muted-foreground md:inline">Sheet 01 — {site.system} assembly</span>
            <div className="flex flex-1 items-center gap-3">
              <span className="text-label text-muted-foreground tabular-nums">{String(Math.round(explode * 100)).padStart(3, "0")}%</span>
              <div className="relative h-px flex-1 bg-border">
                <div className="absolute inset-y-0 left-0 bg-signal" style={{ width: `${explode * 100}%`, height: 2, top: -0.5 }} />
              </div>
              <span className="text-label text-muted-foreground">{explode < 0.98 ? "Assembled → exploded" : "Exploded view"}</span>
            </div>
            <span ref={coordsRef} className="text-label hidden w-32 text-right text-muted-foreground tabular-nums lg:inline">
              X 0000 · Y 0000
            </span>
            <span className="text-label flex items-center gap-1.5 text-foreground">
              {t < 0.97 ? "Scroll" : "Continue"}
              <ArrowDownIcon className="size-3 animate-bounce" />
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

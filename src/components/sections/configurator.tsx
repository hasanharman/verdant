"use client"

import { ArrowRightIcon, DownloadIcon } from "lucide-react"
import { animate, useMotionValue } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { FRAME, GLAZING, GreenhouseDrawing, type FrameColor, type GlazingKey } from "@/components/greenhouse/greenhouse-drawing"
import { BAY, formatMm, MM, SPAN, thousands } from "@/components/greenhouse/scene"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useMotionState } from "@/hooks/use-motion-state"
import { downloadPng, downloadSvg } from "@/lib/export-svg"
import { site } from "@/lib/site"
import { sendSpec } from "@/lib/spec-event"
import { cn } from "@/lib/utils"
import { Section, SectionHeader } from "./section"

const crops = { empty: { label: "Empty", growth: 0 }, seedlings: { label: "Seedlings", growth: 0.3 }, harvest: { label: "Harvest", growth: 1 } }
type CropKey = keyof typeof crops

function Picker<K extends string>({
  legend,
  options,
  value,
  onChange,
  swatches,
  translucent,
}: {
  legend: string
  options: Record<K, { label: string; color?: string }>
  value: K
  onChange: (value: K) => void
  swatches?: boolean
  translucent?: boolean
}) {
  return (
    <FieldSet className="gap-2.5">
      <FieldLegend variant="label">{legend}</FieldLegend>
      <ToggleGroup
        variant="outline"
        size="sm"
        spacing={swatches ? 1.5 : 0}
        className={swatches ? "grid w-full grid-cols-2" : "w-full"}
        value={[value]}
        onValueChange={(v) => v[0] && onChange(v[0] as K)}
      >
        {(Object.entries(options) as [K, { label: string; color?: string }][]).map(([k, { label, color }]) => (
          <ToggleGroupItem key={k} value={k} className={swatches ? "justify-start gap-2" : "flex-1"}>
            {swatches && (
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full border border-foreground/25"
                style={{ background: color, opacity: translucent ? 0.85 : 1 }}
              />
            )}
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </FieldSet>
  )
}

const ventOptions = { closed: { label: "Closed" }, open: { label: "Open" } }
type VentKey = keyof typeof ventOptions

export function Configurator() {
  const [glazing, setGlazing] = useState<GlazingKey>("clear")
  const [frame, setFrame] = useState<FrameColor>("moss")
  const [bays, setBays] = useState(4)
  const [vents, setVents] = useState<VentKey>("closed")
  const [crop, setCrop] = useState<CropKey>("harvest")
  const [explode, setExplode] = useState(0)
  const [labels, setLabels] = useState(true)
  const svgRef = useRef<SVGSVGElement>(null)
  const wide = useMediaQuery("(min-width: 768px)")

  const openMv = useMotionValue(0)
  const open = useMotionState(openMv)
  useEffect(() => {
    const controls = animate(openMv, vents === "open" ? 1 : 0, { duration: 1.4, ease: [0.65, 0, 0.35, 1] })
    return () => controls.stop()
  }, [vents, openMv])

  const growthMv = useMotionValue(1)
  const growth = useMotionState(growthMv)
  useEffect(() => {
    const controls = animate(growthMv, crops[crop].growth, { duration: 1.2, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [crop, growthMv])

  const length = bays * BAY * MM
  const size = `${thousands(length)} × ${formatMm(SPAN * MM)}`
  const spec = `${site.system} · ${bays} bays · ${size} · ${GLAZING[glazing].label} · ${FRAME[frame].label} frame`
  const file = `${site.name.toLowerCase()}-${bays}-bay-${glazing}-${frame}`

  const exportAs = async (kind: "svg" | "png") => {
    if (!svgRef.current) return
    try {
      if (kind === "svg") downloadSvg(svgRef.current, `${file}.svg`, spec)
      else await downloadPng(svgRef.current, `${file}.png`, spec)
      toast.success(`Drawing exported as ${kind.toUpperCase()}`)
    } catch {
      toast.error("Export failed. Try the other format.")
    }
  }

  const quoteSpec = () => {
    sendSpec(spec)
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <Section id="configure">
      <SectionHeader
        index="04"
        eyebrow="Configure"
        title="Draw your greenhouse,"
        accent="then send it over."
        lede="Pick the glazing, the frame colour and the length. Open the vents, grow a crop, pull it apart, and export the drawing as SVG or PNG."
      />

      <div className="mt-14 grid overflow-hidden rounded-lg border bg-card lg:grid-cols-12">
        <aside className="flex flex-col gap-6 border-b p-5 sm:p-6 lg:col-span-4 lg:border-r lg:border-b-0 xl:col-span-3">
          <FieldGroup className="gap-6">
            <Picker legend="Glazing" options={GLAZING} value={glazing} onChange={setGlazing} swatches translucent />
            <Picker legend="Frame" options={FRAME} value={frame} onChange={setFrame} swatches />

            <Field className="gap-3">
              <div className="flex items-baseline justify-between">
                <FieldLabel id="bays-label">Length</FieldLabel>
                <span className="text-label text-muted-foreground tabular-nums">
                  {bays} bays = {formatMm(length)}
                </span>
              </div>
              <Slider
                aria-labelledby="bays-label"
                min={3}
                max={7}
                step={1}
                value={[bays]}
                onValueChange={(v) => setBays(Array.isArray(v) ? v[0] : v)}
              />
            </Field>

            <Picker legend="Vents & door" options={ventOptions} value={vents} onChange={setVents} />
            <Picker legend="Crop" options={crops} value={crop} onChange={setCrop} />

            <Field className="gap-3">
              <div className="flex items-baseline justify-between">
                <FieldLabel id="explode-label">Explode</FieldLabel>
                <span className="text-label text-muted-foreground tabular-nums">{Math.round(explode * 100)}%</span>
              </div>
              <Slider
                aria-labelledby="explode-label"
                min={0}
                max={100}
                value={[explode * 100]}
                onValueChange={(v) => setExplode((Array.isArray(v) ? v[0] : v) / 100)}
              />
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="annotations">Annotations</FieldLabel>
              <Switch id="annotations" checked={labels} onCheckedChange={setLabels} />
            </Field>
          </FieldGroup>

          <Separator />

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => exportAs("svg")}>
                <DownloadIcon data-icon="inline-start" />
                SVG
              </Button>
              <Button variant="outline" onClick={() => exportAs("png")}>
                <DownloadIcon data-icon="inline-start" />
                PNG
              </Button>
            </div>
            <Button size="lg" onClick={quoteSpec}>
              Quote this spec
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </aside>

        <div className="bg-drafting relative flex min-h-[440px] flex-col lg:col-span-8 xl:col-span-9">
          <Corners />
          <div className="relative h-[420px] flex-1 px-2 pt-8 sm:h-[520px] lg:h-auto lg:min-h-[640px]">
            <div className="absolute inset-0 px-3 pt-10 pb-4 sm:px-6">
              <GreenhouseDrawing
                svgRef={svgRef}
                bays={bays}
                glazing={glazing}
                frame={frame}
                explode={explode}
                open={open}
                growth={growth}
                fruit={crop === "harvest"}
                labels={labels ? (wide ? "text" : "number") : "none"}
                dims
                camera
                title={`Drawing of a ${bays}-bay greenhouse glazed with ${GLAZING[glazing].label.toLowerCase()}`}
              />
            </div>
            <p className="text-label absolute top-3 left-4 text-muted-foreground">Fig. 04 — Live drawing</p>
          </div>
          <dl className="relative grid grid-cols-2 border-t bg-background/80 backdrop-blur-sm sm:grid-cols-4">
            {[
              ["System", site.system],
              ["Size", size],
              ["Glazing", GLAZING[glazing].label],
              ["Frame", FRAME[frame].label],
            ].map(([k, v], i) => (
              <div
                key={k}
                className={cn("px-4 py-3", i % 2 === 1 && "border-l", i >= 2 && "border-t sm:border-t-0", i === 2 && "sm:border-l")}
              >
                <dt className="text-label text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 text-sm font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  )
}

/** Crop marks in the drawing's top corners, like a printed sheet. */
function Corners() {
  const mark = "pointer-events-none absolute size-3 border-foreground/40"
  return (
    <>
      <span className={`${mark} top-2 left-2 border-t border-l`} />
      <span className={`${mark} top-2 right-2 border-t border-r`} />
    </>
  )
}

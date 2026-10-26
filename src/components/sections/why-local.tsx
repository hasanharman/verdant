import { reasons } from "@/lib/site"
import { SectionHeader } from "./section-header"

export function WhyLocal() {
  return (
    <section id="why" className="border-t">
      <div className="mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
        <SectionHeader
          index="03"
          eyebrow="Why us"
          title={
            <>
              Planned for your plot. <em className="font-serif font-normal tracking-[-0.02em]">Built for your crop.</em>
            </>
          }
          lede="A greenhouse is a tool for growing. We start from what you want to grow and where, then design the house around it."
        />
        <dl className="mt-14 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((r, i) => (
            <div key={r.title} className="flex flex-col gap-3 border-t py-6">
              <dt className="flex items-baseline gap-3">
                <span className="text-label text-signal">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-lg font-medium tracking-tight">{r.title}</span>
              </dt>
              <dd className="text-sm leading-relaxed text-pretty text-muted-foreground">{r.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

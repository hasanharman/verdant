import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { site } from "@/lib/site"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
})

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  style: ["normal", "italic"],
})

const title = `${site.name} · ${site.tagline}`
const description =
  "Aluminium and glass greenhouses sized to your plot. Surveyed, founded, framed and glazed by one local team."

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: title, template: `%s · ${site.name}` },
  description,
  applicationName: site.name,
  keywords: ["greenhouse", "glass greenhouse", "aluminium greenhouse", "gable greenhouse", "polycarbonate", "isometric", "configurator", "Verdant"],
  authors: [{ name: "strad3r", url: "https://x.com/strad3r" }],
  creator: "strad3r",
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "/", siteName: site.name, title, description, locale: "en_US" },
  twitter: { card: "summary_large_image", title, description, creator: "@strad3r" },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d0b" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
    >
      <body className="min-h-svh">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}

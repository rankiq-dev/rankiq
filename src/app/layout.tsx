import type { Metadata, Viewport } from "next"
import { Syne, JetBrains_Mono } from "next/font/google"
import { cookies } from "next/headers"
import "./globals.css"

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
})

export const viewport: Viewport = { width: "device-width", initialScale: 1 }

export const metadata: Metadata = {
  title: {
    default: "RankIQ — AI-Powered SEO Co-pilot",
    template: "%s | RankIQ",
  },
  description:
    "RankIQ crawls your site, identifies critical SEO issues across 6 disciplines, and generates an AI action plan ranked by revenue impact — in minutes.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "RankIQ",
    title: "RankIQ — AI-Powered SEO Co-pilot",
    description: "Full SEO audit + AI action plan in under 5 minutes. Free to start.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "RankIQ" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RankIQ — AI-Powered SEO Co-pilot",
    description: "Full SEO audit + AI action plan in under 5 minutes.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
    ],
  },
  keywords: ["SEO audit", "AI SEO", "technical SEO", "SEO co-pilot", "keyword tracking", "search console", "SEO tool"],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const theme = cookieStore.get("rankiq_theme")?.value === "light" ? "light" : "dark"
  return (
    <html lang="en" suppressHydrationWarning data-theme={theme}>
      <body className={`${syne.variable} ${jetbrainsMono.variable}`}>
        {children}
      </body>
    </html>
  )
}

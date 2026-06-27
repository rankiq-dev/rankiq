"use client"
import { useEffect, useRef } from "react"

export function AnimatedScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const circleRef = useRef<SVGCircleElement>(null)
  const textRef = useRef<SVGTextElement>(null)

  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    const circle = circleRef.current
    const text = textRef.current
    if (!circle || !text) return

    circle.style.strokeDasharray = `${circumference}`
    circle.style.strokeDashoffset = `${circumference}`

    let start: number | null = null
    const duration = 1400

    const animate = (ts: number) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      const offset = circumference - (eased * score / 100) * circumference
      circle.style.strokeDashoffset = `${offset}`
      text.textContent = Math.round(eased * score).toString()

      if (progress < 1) requestAnimationFrame(animate)
    }

    const raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [score, circumference])

  const color = score >= 90 ? "#4ade80" : score >= 70 ? "#0d9488" : score >= 50 ? "#fbbf24" : "#f87171"
  const glow = score >= 90 ? "oklch(0.68 0.16 155)" : score >= 70 ? "oklch(0.55 0.13 178)" : "oklch(0.65 0.20 27)"

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <filter id="ring-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="oklch(0.22 0.006 230)"
          strokeWidth="8"
        />
        {/* Animated arc */}
        <circle
          ref={circleRef}
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="8"
          strokeLinecap="round"
          filter="url(#ring-glow)"
          style={{ transition: "stroke 0.3s" }}
        />
      </svg>
      {/* Center text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
          <text
            ref={textRef}
            x="50%" y="50%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontSize={size * 0.28}
            fontWeight="800"
            fontFamily="var(--font-mono)"
            fill={color}
            style={{ filter: `drop-shadow(0 0 8px ${glow})` }}
          >
            0
          </text>
          <text
            x="50%" y="68%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fontFamily="var(--font-sans)"
            fill="oklch(0.38 0.008 230)"
            letterSpacing="0.1em"
          >
            HEALTH
          </text>
        </svg>
      </div>
    </div>
  )
}

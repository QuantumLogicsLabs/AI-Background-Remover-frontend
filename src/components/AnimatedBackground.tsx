import { useEffect, useRef } from 'react'

/**
 * AnimatedBackground
 *
 * Full-screen canvas with softly drifting accent-coloured orbs and a
 * floating-particle layer.  Lives at z-index 0 behind all content,
 * pointer-events: none.  Colours are read from CSS custom-properties so
 * the animation adapts to light / dark mode and any accent theme.
 *
 * Light mode uses significantly higher opacities because the warm paper
 * background (#F4F4F1) washes out subtle colours.
 */
export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const c  = ctx
    const cv = canvas

    let animId = 0
    let W = 0
    let H = 0

    // ── helpers ─────────────────────────────────────────────────────────
    function getCSSVar(name: string, fallback: string): string {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
    }

    function isDarkMode(): boolean {
      return document.documentElement.getAttribute('data-theme') === 'dark'
    }

    function hexToRgb(hex: string): [number, number, number] | null {
      const m = hex.replace('#', '').match(/.{2}/g)
      if (!m || m.length < 3) return null
      return [parseInt(m[0], 16), parseInt(m[1], 16), parseInt(m[2], 16)]
    }

    function parseColor(raw: string): [number, number, number] {
      const s = raw.trim()
      const rgba = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (rgba) return [+rgba[1], +rgba[2], +rgba[3]]
      const rgb = hexToRgb(s)
      if (rgb) return rgb
      return [150, 100, 200]
    }

    // ── orbs ────────────────────────────────────────────────────────────
    interface Orb {
      x: number; y: number
      vx: number; vy: number
      radius: number
      r: number; g: number; b: number
      alpha: number
    }

    function makeOrbs(): Orb[] {
      const dark = isDarkMode()
      const p = parseColor(getCSSVar('--accent-primary',   '#E8336D'))
      const s = parseColor(getCSSVar('--accent-secondary', '#2FBFB0'))
      // Light: 3 primary + 2 secondary orbs; dark keeps original 5
      const palette: [number, number, number][] = [p, s, p, s, p]
      // Light mode: alpha 0.18–0.28; dark mode: 0.06–0.12
      const alphaBase  = dark ? 0.06 : 0.18
      const alphaRange = dark ? 0.06 : 0.10
      // Light mode: slightly larger orbs so colour spreads more
      const radiusBase  = dark ? 0.22 : 0.25
      const radiusRange = dark ? 0.18 : 0.20
      return palette.map(([r, g, b]) => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        radius: Math.min(W, H) * (radiusBase + Math.random() * radiusRange),
        r, g, b,
        alpha: alphaBase + Math.random() * alphaRange,
      }))
    }

    // ── particles ───────────────────────────────────────────────────────
    interface Particle {
      x: number; y: number
      vx: number; vy: number
      size: number
      alpha: number
      r: number; g: number; b: number
    }

    function makeParticles(): Particle[] {
      const dark  = isDarkMode()
      // Light: ~2× more particles, bigger, more opaque
      const density     = dark ? 22000 : 10000
      const count       = Math.max(30, Math.floor((W * H) / density))
      const alphaBase   = dark ? 0.08  : 0.20
      const alphaRange  = dark ? 0.14  : 0.25
      const sizeBase    = dark ? 1.0   : 1.4
      const sizeRange   = dark ? 1.5   : 2.0

      const p = parseColor(getCSSVar('--accent-primary',   '#E8336D'))
      const s = parseColor(getCSSVar('--accent-secondary', '#2FBFB0'))

      return Array.from({ length: count }, (_, i) => {
        const [r, g, b] = i % 3 === 0 ? s : p
        return {
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          size:  sizeBase + Math.random() * sizeRange,
          alpha: alphaBase + Math.random() * alphaRange,
          r, g, b,
        }
      })
    }

    // ── grid ────────────────────────────────────────────────────────────
    function drawGrid(): void {
      const dark      = isDarkMode()
      // Light mode: use accent colour at low alpha instead of grey
      const spacing   = 60
      c.save()
      if (dark) {
        c.strokeStyle = `rgba(128,128,128,0.025)`
      } else {
        // Tinted grid — use primary accent at very low alpha
        const [r, g, b] = parseColor(getCSSVar('--accent-primary', '#E8336D'))
        c.strokeStyle = `rgba(${r},${g},${b},0.10)`
      }
      c.lineWidth = dark ? 0.5 : 0.6
      for (let x = 0; x <= W; x += spacing) {
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke()
      }
      for (let y = 0; y <= H; y += spacing) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke()
      }
      c.restore()
    }

    // ── state ───────────────────────────────────────────────────────────
    let orbs: Orb[]           = []
    let particles: Particle[] = []

    function resize(): void {
      W = cv.width  = window.innerWidth
      H = cv.height = window.innerHeight
      orbs      = makeOrbs()
      particles = makeParticles()
    }

    resize()
    window.addEventListener('resize', resize)

    // ── render loop ─────────────────────────────────────────────────────
    function tick(): void {
      c.clearRect(0, 0, W, H)

      drawGrid()

      // orbs
      for (const o of orbs) {
        o.x += o.vx; o.y += o.vy
        if (o.x < -o.radius) o.x = W + o.radius
        if (o.x > W + o.radius) o.x = -o.radius
        if (o.y < -o.radius) o.y = H + o.radius
        if (o.y > H + o.radius) o.y = -o.radius

        const g = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.radius)
        g.addColorStop(0,   `rgba(${o.r},${o.g},${o.b},${o.alpha})`)
        g.addColorStop(0.5, `rgba(${o.r},${o.g},${o.b},${o.alpha * 0.4})`)
        g.addColorStop(1,   `rgba(${o.r},${o.g},${o.b},0)`)
        c.beginPath()
        c.arc(o.x, o.y, o.radius, 0, Math.PI * 2)
        c.fillStyle = g
        c.fill()
      }

      // particles
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = W
        if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H
        if (p.y > H) p.y = 0

        c.beginPath()
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        c.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.alpha})`
        c.fill()
      }

      animId = requestAnimationFrame(tick)
    }

    tick()

    // Refresh when theme / accent changes
    const observer = new MutationObserver(() => {
      orbs      = makeOrbs()
      particles = makeParticles()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-accent'],
    })

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      observer.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}

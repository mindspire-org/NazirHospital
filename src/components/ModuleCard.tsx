import type { ReactNode } from 'react'
import { useRef } from 'react'
import { Link } from 'react-router-dom'

export default function ModuleCard({
  to,
  title,
  description,
  icon,
  tone = 'sky',
}: {
  to: string
  title: string
  description: string
  icon: ReactNode
  tone?: 'sky' | 'emerald' | 'violet' | 'amber' | 'teal'
}) {
  const toneMap: Record<string, string> = {
    sky: 'bg-sky-50 border-sky-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    violet: 'bg-violet-50 border-violet-100',
    amber: 'bg-amber-50 border-amber-100',
    teal: 'bg-teal-50 border-teal-100',
  }

  const cardRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  const onMouseMove = (e: React.MouseEvent) => {
    const el = cardRef.current
    const glow = glowRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const midX = rect.width / 2
    const midY = rect.height / 2
    const rotX = ((midY - y) / midY) * 8
    const rotY = ((x - midX) / midX) * 8
    el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg)`
    if (glow) {
      glow.style.background = `radial-gradient(400px circle at ${x}px ${y}px, rgba(255,255,255,0.18), transparent 40%)`
    }
  }

  const onMouseLeave = () => {
    const el = cardRef.current
    const glow = glowRef.current
    if (el) el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)'
    if (glow) glow.style.background = 'radial-gradient(400px circle at 50% 50%, rgba(255,255,255,0.12), transparent 40%)'
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="card home-featured-card relative transform-gpu transition-transform duration-300 will-change-transform"
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div ref={glowRef} className="pointer-events-none absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(420px circle at 50% 50%, rgba(14,165,233,0.20), transparent 45%)' }} />
      <div className="flex items-start gap-4">
        <div className={`shrink-0 rounded-2xl p-3 border shadow-sm ${toneMap[tone]}`} style={{ transform: 'translateZ(24px)' }}>
          {icon}
        </div>
        <div className="flex-1" style={{ transform: 'translateZ(16px)' }}>
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <p className="mt-1 text-slate-600">
            {description}
          </p>
          <div className="mt-4">
            <Link to={to} className="btn text-sm transition-transform duration-200 hover:translate-x-0.5">
              Open →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

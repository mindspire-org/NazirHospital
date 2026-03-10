import ModuleCard from '../components/ModuleCard'
import { Stethoscope, FlaskConical, Pill, FileText, PhoneIncoming, Sparkles } from 'lucide-react'
import { useRef } from 'react'
import './home.css'

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null)
  const onHeroMove = (e: React.MouseEvent) => {
    const el = heroRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const midX = rect.width / 2
    const midY = rect.height / 2
    const rotX = ((midY - y) / midY) * 6
    const rotY = ((x - midX) / midX) * 6
    el.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`
  }
  const onHeroLeave = () => {
    const el = heroRef.current
    if (el) el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)'
  }

  const modules = [
    { to: '/hospital/login', title: 'Hospital', description: 'Appointments, admissions, billing, and EMR.', icon: <Stethoscope className="size-7 text-sky-600" />, tone: 'sky' as const },
    { to: '/lab/login', title: 'Lab', description: 'Lab orders, tests, and results management.', icon: <FlaskConical className="size-7 text-emerald-600" />, tone: 'emerald' as const },
    // { to: '/diagnostic/login', title: 'Diagnostics', description: 'Diagnostic tokens, tests, tracking, and reports.', icon: <FlaskConical className="size-7 text-teal-600" />, tone: 'teal' as const },
    { to: '/pharmacy/login', title: 'Pharmacy', description: 'Prescriptions, inventory, and POS.', icon: <Pill className="size-7 text-violet-600" />, tone: 'violet' as const },
    // { to: '/aesthetic/login', title: 'Aesthetic', description: 'Aesthetic treatments, bookings, and billing.', icon: <Sparkles className="size-7 text-violet-600" />, tone: 'violet' as const },
    { to: '/finance', title: 'Finance', description: 'Financial management and accounting.', icon: <FileText className="size-7 text-amber-600" />, tone: 'amber' as const },
    { to: '/reception', title: 'Reception', description: 'Front-desk, patient registration, and triage.', icon: <PhoneIncoming className="size-7 text-teal-600" />, tone: 'teal' as const },
  ]

  return (
    <div className="min-h-dvh relative overflow-hidden">
      <div className="home-grid" />
      <div className="home-spotlight" />
      <div className="home-orb" style={{ left: '-160px', top: '-120px' }} />
      <div className="home-orb secondary" style={{ right: '-140px', bottom: '-160px' }} />

      <header className="relative z-10 mx-auto max-w-6xl px-6 pt-12 text-center home-hero">
        <div ref={heroRef} onMouseMove={onHeroMove} onMouseLeave={onHeroLeave} className="home-hero-tilt mx-auto">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight"
            style={{
              transform: 'translateZ(60px)',
              backgroundImage: 'linear-gradient(90deg, #0f2d5c 0%, #3b82f6 50%, #0f2d5c 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Complete Hospital Management System
          </h1>
          <p className="mt-3 text-slate-600" style={{ transform: 'translateZ(24px)' }}>Select a module to start</p>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 md:grid-cols-2">
          {modules.map((m, i) => (
            <div key={m.title} className="home-card-appear" style={{ animationDelay: `${i * 90}ms` }}>
              <ModuleCard {...m} />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}


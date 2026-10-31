import { useEffect, useState } from 'react'

export default function Intro() {
  const [done, setDone] = useState(false)
  const [bgOk, setBgOk] = useState(true)
  const [logoOk, setLogoOk] = useState(true)
  const [show, setShow] = useState(() => {
    try {
      return !sessionStorage.getItem('payguard_intro_shown')
    } catch {
      return false
    }
  })

  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (!show) return
    try { sessionStorage.setItem('payguard_intro_shown', '1') } catch { /* ignore */ }
    document.body.style.overflow = 'hidden'
    const totalDuration = reduced ? 600 : 4000
    const t = setTimeout(() => {
      setDone(true)
      document.body.style.overflow = ''
      setTimeout(() => setShow(false), 400)
    }, totalDuration)
    return () => {
      clearTimeout(t)
      document.body.style.overflow = ''
    }
  }, [show, reduced])

  if (!show) return null

  return (
    <div className={`fixed inset-0 z-[100] flex items-start justify-start overflow-hidden bg-navy ${done ? 'pg-intro-fadeout' : ''}`}>
      {bgOk ? (
        <img
          src="/payguard-intro-bg.png"
          alt=""
          onError={() => setBgOk(false)}
          className="absolute inset-0 w-full h-full object-cover pg-intro-bg"
        />
      ) : (
        <div className="absolute inset-0 bg-navy" />
      )}
      <div className="absolute inset-0 bg-navy/40 pg-intro-overlay" />
      <div className="absolute w-[70vmax] h-[70vmax] rounded-full bg-cyanx/5 blur-[120px] pg-intro-glow" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      
      <div className="relative z-10 pg-intro-logo-container">
        {logoOk ? (
          <img
            src="/payguard-logo-clean.svg"
            alt="PayGuard"
            onError={() => setLogoOk(false)}
            className="pg-intro-logo"
          />
        ) : (
          <div className="pg-intro-logo-fallback">
            <svg viewBox="0 0 280 280" className="w-full h-full" fill="none">
              <circle cx="140" cy="85" r="38" stroke="#22D3EE" stroke-width="2" opacity="0.6"/>
              <path d="M130,85 L138,93 L152,77" stroke="#22D3EE" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <text x="140" y="178" text-anchor="middle" font-family="'Space Grotesk', 'Inter', sans-serif" font-size="28" font-weight="700" letter-spacing="2" fill="#F8FAFC">PAYGUARD</text>
              <path d="M118,215 Q140,228 162,215" stroke="#22D3EE" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.7"/>
            </svg>
          </div>
        )}
      </div>
      
      <div className="absolute inset-0 z-20 pointer-events-none pg-intro-sweep" />
    </div>
  )
}
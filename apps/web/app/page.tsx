import Link from 'next/link'

const STEPS = [
  { n: '01', t: 'Armás tu lista',   d: 'Pegá links de Mercado Libre, Amazon, donde sea. O escribí "una torta de chocolate". Lo que quieras, como quieras.' },
  { n: '02', t: 'Mandás el link',   d: 'A tu grupo, por mensaje, por mail. No bajan ninguna app. Solo abren el link.' },
  { n: '03', t: 'Reclaman lo suyo', d: 'Cada amigo elige un regalo. Aparece como reclamado en vivo. Nadie llega con la misma cosa.' },
]

const WITHOUT = [
  'Mensajes cruzados sin parar',
  '"¿Quién trae qué?" en bucle',
  'Dos personas traen lo mismo',
  'Te olvidás qué prometiste',
  'Cero modo sorpresa',
  'Termina siempre uno coordinando',
]

const WITH = [
  'Botón "ME ENCARGO YO"',
  'Un link, todos lo ven',
  'Se tacha solo en vivo',
  'Pegás link y autollena el item',
  'Sorpresa total o parcial',
  'Regalos grupales con aportes',
]

const USE_CASES = [
  ['◐', 'Cumpleaños'],   ['○', 'Baby showers'],
  ['◆', 'Casamientos'],  ['✿', 'Quinces'],
  ['◇', 'Egresos'],     ['●', 'Mudanzas'],
  ['◓', 'Aniversarios'], ['◈', 'Cosas que querés y ya'],
]

const TESTIMONIALS = [
  { q: 'No más "ya lo compré, no compres lo mismo" en el grupo. Cambió mi cumple.', name: 'Sofí M.', city: 'Buenos Aires', rotate: '-1.5deg', bg: 'var(--paper)' },
  { q: 'Lo usé para el baby de mi hermana. Las primas dejaron de pelearse por el moisés.', name: 'Lucía G.', city: 'Córdoba', rotate: '1deg', bg: 'var(--yellow)' },
  { q: 'Lo armaba a mano para mi casamiento, mensaje por mensaje. Esto cambia todo.', name: 'Tomás L.', city: 'Mendoza', rotate: '-0.8deg', bg: 'var(--paper)' },
]

const FAQS = [
  { q: '¿Tengo que pagar algo?', a: 'Hoy, no. La versión para coordinar tus listas es gratis. Si en algún momento agregamos premium, avisamos antes — y lo básico se queda como está.' },
  { q: '¿Mis amigos tienen que crear cuenta?', a: 'No. Abren el link, eligen un regalo, ponen su nombre, listo. Nada de instalar apps. Nada de signups.' },
  { q: '¿Puedo poner cosas sin link de tienda?', a: 'Sí. Podés poner "una torta de chocolate", "una planta linda", "que vengan a tomar mate". El item no necesita URL ni foto ni precio.' },
  { q: '¿Funciona en Argentina y otros países?', a: 'Sí. Empezamos en Argentina pero funciona en cualquier país de LATAM y España. Multi-moneda (ARS, BRL, MXN, CLP, COP, EUR, USD).' },
  { q: '¿Puedo hacer una lista privada?', a: 'Sí. Tres niveles: pública (en tu perfil), solo con link (no aparece pero quien tenga el link la ve), o privada (solo vos).' },
  { q: '¿Y si no quiero saber qué me van a regalar?', a: 'Modo sorpresa total. La lista funciona normal para tus amigos, pero vos no ves nada hasta el evento.' },
]

const MOCK_PHONE_ITEMS = [
  { t: 'Cafetera Moka', claimed: 'TOMÁS' },
  { t: 'Botella de Malbec', claimed: null },
  { t: 'Auriculares Sony', claimed: 'LUCÍA' },
  { t: 'Una torta', claimed: null },
  { t: 'Plantita monstera', claimed: 'CAMI' },
]

function Logomark() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={32} height={32} viewBox="0 0 32 32" fill="none">
        <path d="M6 8 L6 28 L26 28 L26 8 L18 8 L16 4 L14 8 Z" fill="#F5E13E" stroke="#0F0F0F" strokeWidth="2" strokeLinejoin="round"/>
        <circle cx="16" cy="7" r="2" fill="none" stroke="#0F0F0F" strokeWidth="1.5"/>
        <circle cx="22" cy="10" r="2.5" fill="#E63322"/>
      </svg>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: -0.5 }}>
        regala<span style={{ color: '#E63322' }}>.</span><span style={{ fontSize: 18 }}>me</span>
      </span>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg text-ink">

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 flex items-center justify-between px-5 md:px-9 py-4 bg-paper border-b-2 border-ink">
        <Logomark />
        <div className="flex gap-2 items-center">
          <Link href="/auth" className="rg-btn rg-btn-ghost" style={{ padding: '8px 12px', fontSize: 11 }}>
            INGRESAR
          </Link>
          <Link href="/auth?mode=signup" className="rg-btn rg-btn-primary" style={{ padding: '8px 14px', fontSize: 11 }}>
            EMPEZAR →
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="rg-mono mb-3">v1 · Desde Buenos Aires · para LATAM</div>
          <h1 className="rg-display mb-5" style={{ fontSize: 'clamp(3rem, 10vw, 8rem)', lineHeight: 0.88 }}>
            TU LISTA<br />
            DE REGALOS,<br />
            <span className="rg-em">SIN DRAMAS.</span>
          </h1>
          <p className="mb-7 text-base leading-relaxed" style={{ color: 'rgba(15,15,15,0.8)', maxWidth: 480 }}>
            Compartí una lista, tus amigos eligen lo que traen, nadie llega con la misma cosa.
            Sin instalar nada, sin grupos infinitos peleándose por quién compra qué.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Link href="/auth?mode=signup" className="rg-btn rg-btn-primary text-center" style={{ padding: '16px 24px' }}>
              CREAR MI LISTA →
            </Link>
            <Link href="#como-funciona" className="rg-btn rg-btn-ghost text-center" style={{ padding: '16px 24px' }}>
              VER CÓMO FUNCIONA
            </Link>
          </div>
        </div>

        {/* Phone card mockup */}
        <div className="hero-phone">
          <div style={{
            position: 'absolute', top: -12, right: 120, zIndex: 5,
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
            background: 'var(--yellow)', padding: '4px 10px',
            border: '1.5px solid var(--ink)',
            transform: 'rotate(-3deg)',
          }}>
            EJEMPLO REAL
          </div>
          <div style={{
            width: 260, background: 'var(--paper)',
            border: '3px solid var(--ink)',
            boxShadow: '10px 10px 0 0 var(--ink)',
            padding: 18, transform: 'rotate(2deg)',
          }}>
            <div className="rg-display mb-3" style={{ fontSize: 34, lineHeight: 0.9, letterSpacing: -1 }}>
              LOS <span className="rg-em">30</span><br />DE SOFÍ.
            </div>
            <div className="flex flex-col gap-1.5">
              {MOCK_PHONE_ITEMS.map(item => (
                <div key={item.t} className="flex items-center justify-between border-2 border-ink px-2.5 py-1.5" style={{ fontSize: 11, fontWeight: 700 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                    {item.t}
                  </span>
                  {item.claimed
                    ? <span className="rg-sticker rg-sticker-green" style={{ fontSize: 8 }}>✓ {item.claimed}</span>
                    : <span style={{ fontSize: 9, fontFamily: 'var(--font-display)', border: '1.5px dashed var(--ink)', padding: '2px 6px' }}>LIBRE</span>
                  }
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 STEPS ──────────────────────────────────────── */}
      <section id="como-funciona" className="px-5 md:px-9 py-12 md:py-14 bg-yellow border-y-2 border-ink">
        <div className="rg-mono mb-1.5">Cómo funciona</div>
        <h2 className="rg-display mb-7" style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)' }}>
          TRES PASOS. <span className="rg-em">NADA MÁS.</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map(s => (
            <div key={s.n} className="rg-card p-5">
              <div className="text-red mb-2.5" style={{ fontFamily: 'var(--font-display)', fontSize: 52, lineHeight: 1 }}>{s.n}</div>
              <div className="font-bold text-lg mb-2">{s.t}</div>
              <div className="text-sm leading-relaxed" style={{ color: 'rgba(15,15,15,0.82)' }}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ANTES Y DESPUÉS ──────────────────────────────── */}
      <section className="px-5 md:px-9 py-12 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
          <div>
            <div className="rg-mono mb-1.5">El antes y el después</div>
            <h2 className="rg-display mb-5" style={{ fontSize: 'clamp(2.5rem, 5vw, 5.5rem)' }}>
              SIN ESTO,<br /><span className="rg-em">UN QUILOMBO.</span>
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(15,15,15,0.82)' }}>
              Todos pasamos por lo mismo: mensajes cruzados, tres personas trayendo lo mismo,
              alguien que se olvida qué prometió. <strong>regala.me</strong> hace que coordinarse no sea un trabajo.
            </p>
          </div>
          <div className="border-2 border-ink shadow-hard">
            <div className="grid grid-cols-2">
              <div className="p-4 md:p-5 border-r-2 border-ink" style={{ background: 'rgba(15,15,15,0.04)' }}>
                <div className="mb-3" style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 1.2, color: 'rgba(15,15,15,0.5)' }}>
                  SIN REGALA.ME
                </div>
                {WITHOUT.map(t => (
                  <div key={t} className="flex gap-1.5 py-1 border-t border-ink/10 text-xs leading-snug" style={{ color: 'rgba(15,15,15,0.75)' }}>
                    <span className="text-red font-black shrink-0">✕</span> {t}
                  </div>
                ))}
              </div>
              <div className="p-4 md:p-5 bg-yellow">
                <div className="mb-3" style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 1.2 }}>
                  CON REGALA.ME
                </div>
                {WITH.map(t => (
                  <div key={t} className="flex gap-1.5 py-1 border-t border-ink/10 text-xs leading-snug font-bold">
                    <span className="text-green font-black shrink-0">✓</span> {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── USE CASES ────────────────────────────────────── */}
      <section className="px-5 md:px-9 py-12 md:py-14 border-t-2 border-ink" style={{ background: 'rgba(15,15,15,0.035)' }}>
        <div className="rg-mono mb-1.5">Sirve para</div>
        <h2 className="rg-display mb-6" style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)' }}>
          CUALQUIER <span className="rg-em">EXCUSA.</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {USE_CASES.map(([g, l]) => (
            <div key={l} className="flex items-center gap-3 p-3 md:p-4 border-2 border-ink bg-paper shadow-hard-sm">
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>{g}</span>
              <span className="font-bold text-sm">{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────── */}
      <section className="px-5 md:px-9 py-12 md:py-14 border-t-2 border-ink">
        <div className="rg-mono mb-1.5">Lo que dice la gente</div>
        <h2 className="rg-display mb-7" style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)' }}>
          (PORQUE <span className="rg-em">FUNCIONA.</span>)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="p-5 border-2 border-ink shadow-hard" style={{
              background: t.bg,
              transform: `rotate(${t.rotate})`,
            }}>
              <div className="rg-display text-red" style={{ fontSize: 56, lineHeight: 0.5 }}>"</div>
              <div className="text-sm leading-relaxed font-semibold mt-2.5">{t.q}</div>
              <div className="mt-4" style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 1 }}>
                — {t.name.toUpperCase()} · {t.city.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="px-5 md:px-9 py-12 md:py-14 bg-yellow border-t-2 border-ink">
        <div className="rg-mono mb-1.5">Preguntas</div>
        <h2 className="rg-display mb-7" style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)' }}>
          LAS DUDAS <span className="rg-em">DE SIEMPRE.</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FAQS.map((f, i) => (
            <div key={i} className={`p-4 bg-paper border-2 border-ink shadow-hard-sm${i >= 3 ? ' hidden md:block' : ''}`}>
              <div className="mb-1.5" style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: 0.3 }}>
                {f.q.toUpperCase()}
              </div>
              <div className="text-sm leading-relaxed" style={{ color: 'rgba(15,15,15,0.82)' }}>{f.a}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 md:hidden">
          <a href="#" className="rg-btn rg-btn-ghost block text-center" style={{ padding: '12px 20px' }}>
            VER TODAS LAS PREGUNTAS →
          </a>
        </div>
      </section>

      {/* ── BIG CTA ──────────────────────────────────────── */}
      <section className="px-5 md:px-9 py-16 md:py-20 text-center bg-ink">
        <h2 className="rg-display text-paper mb-3" style={{ fontSize: 'clamp(2.5rem, 8vw, 8rem)', lineHeight: 0.88 }}>
          DEJÁ DE<br />PELEAR POR<br /><span className="text-yellow">LOS REGALOS.</span>
        </h2>
        <p className="mb-8 mt-4 text-base" style={{ color: 'rgba(251,248,238,0.6)' }}>
          Gratis. Sin instalar nada. En dos minutos.
        </p>
        <Link href="/auth?mode=signup" className="rg-btn rg-btn-yellow" style={{ padding: '18px 32px', fontSize: 16 }}>
          CREAR MI LISTA GRATIS →
        </Link>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="border-t-2 border-ink px-5 md:px-9 py-6 flex flex-col sm:flex-row items-center gap-4 sm:justify-between">
        <Logomark />
        <div className="rg-mono text-center" style={{ fontSize: 10, color: 'rgba(15,15,15,0.5)' }}>
          hecho con · café · y · fernet · en BA
        </div>
        <div className="flex gap-5" style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 0.5 }}>
          <Link href="/auth" className="text-ink no-underline">INGRESAR</Link>
          <Link href="/auth?mode=signup" className="text-ink no-underline">REGISTRARSE</Link>
        </div>
      </footer>
    </div>
  )
}

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

function Logomark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Gift tag mark */}
      <svg width={32} height={32} viewBox="0 0 32 32" fill="none">
        <path d="M6 8 L6 28 L26 28 L26 8 L18 8 L16 4 L14 8 Z" fill="#F5E13E" stroke="#0F0F0F" strokeWidth="2" strokeLinejoin="round"/>
        <circle cx="16" cy="7" r="2" fill="none" stroke="#0F0F0F" strokeWidth="1.5"/>
        <circle cx="22" cy="10" r="2.5" fill="#E63322"/>
      </svg>
      <span style={{ fontFamily: 'var(--font-archivo-black)', fontSize: 22, letterSpacing: -0.5 }}>
        regala<span style={{ color: '#E63322' }}>.</span><span style={{ fontSize: 18 }}>me</span>
      </span>
    </div>
  )
}

const MOCK_PHONE_ITEMS = [
  { t: 'Cafetera Moka', claimed: 'TOMÁS' },
  { t: 'Botella de Malbec', claimed: null },
  { t: 'Auriculares Sony', claimed: 'LUCÍA' },
  { t: 'Una torta', claimed: null },
  { t: 'Plantita monstera', claimed: 'CAMI' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav style={{
        padding: '16px 36px',
        borderBottom: '2px solid var(--ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--paper)',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <Logomark />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/auth" className="rg-btn rg-btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}>
            INGRESAR
          </Link>
          <Link href="/auth?mode=signup" className="rg-btn rg-btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
            EMPEZAR →
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="rg-mono" style={{ marginBottom: 14 }}>
            v1 · DESDE BUENOS AIRES · PARA LATAM
          </div>
          <h1 className="rg-display" style={{ fontSize: 'clamp(3rem, 10vw, 8rem)', lineHeight: 0.88, marginBottom: 22 }}>
            TU LISTA<br />
            DE REGALOS,<br />
            <span className="rg-em">SIN DRAMAS.</span>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.5, color: 'rgba(15,15,15,0.8)', maxWidth: 480, marginBottom: 28 }}>
            Compartí una lista, tus amigos eligen lo que traen, nadie llega con la misma cosa.
            Sin instalar nada, sin grupos infinitos peleándose por quién compra qué.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/auth?mode=signup" className="rg-btn rg-btn-primary" style={{ padding: '16px 24px' }}>
              CREAR MI LISTA →
            </Link>
            <Link href="#como-funciona" className="rg-btn rg-btn-ghost" style={{ padding: '16px 24px' }}>
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
            <div className="rg-display" style={{ fontSize: 34, lineHeight: 0.9, letterSpacing: -1, marginBottom: 14 }}>
              LOS <span className="rg-em">30</span><br />DE SOFÍ.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {MOCK_PHONE_ITEMS.map(item => (
                <div key={item.t} style={{
                  padding: '7px 10px', border: '2px solid var(--ink)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: 11, fontWeight: 700,
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                    {item.t}
                  </span>
                  {item.claimed
                    ? <span className="rg-sticker rg-sticker-green" style={{ fontSize: 8 }}>✓ {item.claimed}</span>
                    : <span style={{
                        fontSize: 9, fontFamily: 'var(--font-display)',
                        border: '1.5px dashed var(--ink)', padding: '2px 6px',
                      }}>LIBRE</span>
                  }
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 STEPS ──────────────────────────────────────── */}
      <section id="como-funciona" style={{
        padding: '52px 36px',
        background: 'var(--yellow)',
        borderTop: '2px solid var(--ink)', borderBottom: '2px solid var(--ink)',
      }}>
        <div className="rg-mono" style={{ marginBottom: 6 }}>Cómo funciona</div>
        <h2 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)', marginBottom: 28 }}>
          TRES PASOS. <span className="rg-em">NADA MÁS.</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {STEPS.map(s => (
            <div key={s.n} className="rg-card" style={{ padding: 22 }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 52, lineHeight: 1,
                color: 'var(--red)', marginBottom: 10,
              }}>{s.n}</div>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>{s.t}</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(15,15,15,0.82)' }}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ANTES Y DESPUÉS ──────────────────────────────── */}
      <section style={{ padding: '52px 36px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
          <div>
            <div className="rg-mono" style={{ marginBottom: 6 }}>El antes y el después</div>
            <h2 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 5vw, 5.5rem)', marginBottom: 18 }}>
              SIN ESTO,<br /><span className="rg-em">UN QUILOMBO.</span>
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(15,15,15,0.82)' }}>
              Todos pasamos por lo mismo: mensajes cruzados, tres personas trayendo lo mismo,
              alguien que se olvida qué prometió. <strong>regala.me</strong> hace que coordinarse no sea un trabajo.
            </p>
          </div>
          <div style={{ border: '2px solid var(--ink)', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: 20, borderRight: '2px solid var(--ink)', background: 'rgba(15,15,15,0.04)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 1.2, marginBottom: 12, color: 'rgba(15,15,15,0.5)' }}>
                  SIN REGALA.ME
                </div>
                {WITHOUT.map(t => (
                  <div key={t} style={{ fontSize: 12, lineHeight: 1.45, padding: '5px 0', borderTop: '1px solid rgba(15,15,15,0.1)', display: 'flex', gap: 7, color: 'rgba(15,15,15,0.75)' }}>
                    <span style={{ color: 'var(--red)', fontWeight: 900 }}>✕</span> {t}
                  </div>
                ))}
              </div>
              <div style={{ padding: 20, background: 'var(--yellow)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 1.2, marginBottom: 12 }}>
                  CON REGALA.ME
                </div>
                {WITH.map(t => (
                  <div key={t} style={{ fontSize: 12, lineHeight: 1.45, padding: '5px 0', borderTop: '1px solid rgba(15,15,15,0.15)', display: 'flex', gap: 7, fontWeight: 700 }}>
                    <span style={{ color: 'var(--green)', fontWeight: 900 }}>✓</span> {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── USE CASES ────────────────────────────────────── */}
      <section style={{ padding: '52px 36px', borderTop: '2px solid var(--ink)', background: 'rgba(15,15,15,0.035)' }}>
        <div className="rg-mono" style={{ marginBottom: 6 }}>Sirve para</div>
        <h2 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)', marginBottom: 24 }}>
          CUALQUIER <span className="rg-em">EXCUSA.</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {USE_CASES.map(([g, l]) => (
            <div key={l} style={{
              padding: 16, border: '2px solid var(--ink)', background: 'var(--paper)',
              boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>{g}</span>
              <span style={{ fontWeight: 800, fontSize: 14 }}>{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────── */}
      <section style={{ padding: '52px 36px', borderTop: '2px solid var(--ink)' }}>
        <div className="rg-mono" style={{ marginBottom: 6 }}>Lo que dice la gente</div>
        <h2 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)', marginBottom: 28 }}>
          (PORQUE <span className="rg-em">FUNCIONA.</span>)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} style={{
              padding: 22, background: t.bg,
              border: '2px solid var(--ink)', boxShadow: 'var(--shadow)',
              transform: `rotate(${t.rotate})`,
            }}>
              <div className="rg-display" style={{ fontSize: 56, lineHeight: 0.5, color: 'var(--red)' }}>"</div>
              <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 10, fontWeight: 600 }}>{t.q}</div>
              <div style={{ marginTop: 16, fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 1 }}>
                — {t.name.toUpperCase()} · {t.city.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section style={{
        padding: '52px 36px',
        background: 'var(--yellow)',
        borderTop: '2px solid var(--ink)',
      }}>
        <div className="rg-mono" style={{ marginBottom: 6 }}>Preguntas</div>
        <h2 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)', marginBottom: 28 }}>
          LAS DUDAS <span className="rg-em">DE SIEMPRE.</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {FAQS.map((f, i) => (
            <div key={i} style={{
              padding: '16px 18px', background: 'var(--paper)',
              border: '2px solid var(--ink)', boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: 0.3, marginBottom: 6 }}>
                {f.q.toUpperCase()}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(15,15,15,0.82)' }}>{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BIG CTA ──────────────────────────────────────── */}
      <section style={{ background: 'var(--ink)', padding: '72px 36px', textAlign: 'center' }}>
        <h2 className="rg-display" style={{ fontSize: 'clamp(3rem, 8vw, 8rem)', color: 'var(--paper)', lineHeight: 0.88, marginBottom: 12 }}>
          DEJÁ DE<br />PELEAR POR<br /><span style={{ color: 'var(--yellow)' }}>LOS REGALOS.</span>
        </h2>
        <p style={{ color: 'rgba(251,248,238,0.6)', fontSize: 16, marginBottom: 32, marginTop: 16 }}>
          Gratis. Sin instalar nada. En dos minutos.
        </p>
        <Link href="/auth?mode=signup" className="rg-btn rg-btn-yellow" style={{ padding: '18px 32px', fontSize: 16 }}>
          CREAR MI LISTA GRATIS →
        </Link>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer style={{
        borderTop: '2px solid var(--ink)', padding: '24px 36px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Logomark />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(15,15,15,0.5)' }}>
          hecho con · café · y · fernet · en BA
        </div>
        <div style={{ display: 'flex', gap: 20, fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 0.5 }}>
          <Link href="/auth" style={{ color: 'inherit', textDecoration: 'none' }}>INGRESAR</Link>
          <Link href="/auth?mode=signup" style={{ color: 'inherit', textDecoration: 'none' }}>REGISTRARSE</Link>
        </div>
      </footer>
    </div>
  )
}

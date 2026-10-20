import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Logomark from '@/components/Logomark'
import { OCCASION_PAGES, type OccasionPageId } from '@/lib/occasion-pages'

type Props = { params: Promise<{ occasion: string }> }

const isOccasionPage = (occasion: string): occasion is OccasionPageId =>
  Object.prototype.hasOwnProperty.call(OCCASION_PAGES, occasion)

export function generateStaticParams() {
  return Object.keys(OCCASION_PAGES).map((occasion) => ({ occasion }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { occasion } = await params
  if (!isOccasionPage(occasion)) return {}

  const page = OCCASION_PAGES[occasion]
  return {
    title: `${page.title} — regala.me`,
    description: page.intro,
    alternates: { canonical: `/regalos-para/${occasion}` },
    openGraph: { title: page.title, description: page.intro },
  }
}

export default async function OccasionPage({ params }: Props) {
  const { occasion } = await params
  if (!isOccasionPage(occasion)) notFound()

  const page = OCCASION_PAGES[occasion]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <header style={{ background: 'var(--paper)', borderBottom: '2px solid var(--ink)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '14px 16px' }}>
          <Logomark size={20} />
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 16px 60px' }}>
        <h1 className="rg-display" style={{ fontSize: 'clamp(40px, 9vw, 64px)', lineHeight: 0.88, marginBottom: 20 }}>
          {page.title.toUpperCase()}
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.5, marginBottom: 32 }}>{page.intro}</p>

        <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 40px', display: 'grid', gap: 14 }}>
          {page.tips.map((tip, i) => (
            <li key={tip} className="rg-card" style={{ padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span className="rg-mono" style={{ fontSize: 12, color: 'var(--red-ink)' }}>0{i + 1}</span>
              <span style={{ fontSize: 16, lineHeight: 1.45 }}>{tip}</span>
            </li>
          ))}
        </ol>

        <div style={{ background: 'var(--ink)', color: 'var(--paper)', border: '2px solid var(--ink)', boxShadow: 'var(--shadow)', padding: '24px 22px', textAlign: 'center' }}>
          <div className="rg-display" style={{ fontSize: 26, lineHeight: 0.92, marginBottom: 16 }}>
            ARMÁ TU LISTA <span style={{ color: 'var(--yellow)' }}>EN MINUTOS</span>
          </div>
          <Link href="/auth?mode=signup" className="rg-btn rg-btn-yellow" style={{ padding: '12px 22px', fontSize: 13 }}>
            EMPEZAR →
          </Link>
        </div>
      </main>
    </div>
  )
}

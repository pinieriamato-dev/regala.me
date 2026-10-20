import Link from 'next/link'

interface LogomarkProps {
  size?: number
  href?: string
  withIcon?: boolean
}

// Brand icon from the landing page. Kept as a hard-coded SVG so it renders the same everywhere.
function LogoIcon({ size }: { size: number }) {
  return (
    <svg width={size + 10} height={size + 10} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      <path d="M6 8 L6 28 L26 28 L26 8 L18 8 L16 4 L14 8 Z" fill="#F5E13E" stroke="#0F0F0F" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="16" cy="7" r="2" fill="none" stroke="#0F0F0F" strokeWidth="1.5" />
      <circle cx="22" cy="10" r="2.5" fill="#E63322" />
    </svg>
  )
}

export default function Logomark({ size = 18, href = '/', withIcon = false }: LogomarkProps) {
  const word = (
    <span style={{ fontFamily: 'var(--font-display)', fontSize: size, letterSpacing: -0.5 }}>
      regala<span style={{ color: 'var(--red)' }}>.</span>me
    </span>
  )
  const content = withIcon ? (
    <span className="flex items-center gap-2.5">
      <LogoIcon size={size} />
      {word}
    </span>
  ) : word
  return href ? (
    <Link href={href} style={{ textDecoration: 'none', color: 'var(--ink)' }}>
      {content}
    </Link>
  ) : content
}

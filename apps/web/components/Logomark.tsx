import Link from 'next/link'

interface LogomarkProps {
  size?: number
  href?: string
}

export default function Logomark({ size = 18, href = '/' }: LogomarkProps) {
  const content = (
    <span style={{ fontFamily: 'var(--font-display)', fontSize: size, letterSpacing: -0.5 }}>
      regala<span style={{ color: 'var(--red)' }}>.</span>me
    </span>
  )
  return href ? (
    <Link href={href} style={{ textDecoration: 'none', color: 'var(--ink)' }}>
      {content}
    </Link>
  ) : content
}

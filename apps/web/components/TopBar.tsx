import Logomark from '@/components/Logomark'

interface TopBarProps {
  children?: React.ReactNode
  logoHref?: string
  logoSize?: number
  maxWidth?: number
  band?: boolean
  sticky?: boolean
}

// Shared header for public and dashboard pages. Children fill the right-hand slot.
export default function TopBar({ children, logoHref = '/', logoSize = 20, maxWidth, band = false, sticky = false }: TopBarProps) {
  return (
    <>
      {band && <div className="rg-topbar-band" aria-hidden="true" />}
      <header className={sticky ? 'rg-topbar is-sticky' : 'rg-topbar'}>
        <div className="rg-topbar-inner" style={maxWidth ? { maxWidth } : undefined}>
          <Logomark size={logoSize} href={logoHref} />
          {children}
        </div>
      </header>
    </>
  )
}

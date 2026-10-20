'use client'

import { useState, useCallback, useEffect, useRef, useTransition, type CSSProperties } from 'react'
import { formatPrice, type Item } from 'shared'
import ClaimButton from './claim-button'
import PledgeButton from './pledge-button'
import { releaseClaim } from './actions'

type Props = {
  items: Item[]
  claimedIds: string[]
  currency: string
  // Owner looking at their own surprise list: the server sends no claim data, so hide claim UI too.
  ownerSurpriseView: boolean
  // Amount already pledged per item by shared-gift gifters. Empty on surprise lists.
  raised: Record<string, number>
  // False on surprise lists: a shared gift would show how much was raised.
  sharesOpen: boolean
}

const tokenKey = (itemId: string) => `regalame:claim:${itemId}`

function readToken(itemId: string): string | null {
  try { return localStorage.getItem(tokenKey(itemId)) } catch { return null }
}
function writeToken(itemId: string, token: string | null) {
  try {
    if (token) localStorage.setItem(tokenKey(itemId), token)
    else localStorage.removeItem(tokenKey(itemId))
  } catch {}
}

// Paper squares that burst out of the stamp when this browser claims a gift. Pure CSS, invisible to assistive tech.
function Confetti() {
  return (
    <span className="rg-confetti" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <i key={i} style={{
          '--a': `${(i / 14) * 360}deg`,
          '--d': `${48 + (i % 3) * 18}px`,
          '--c': ['var(--yellow)', 'var(--red)', 'var(--green)', 'var(--paper)'][i % 4],
        } as CSSProperties} />
      ))}
    </span>
  )
}

export default function GifterItems({ items, claimedIds, currency, ownerSurpriseView, raised, sharesOpen }: Props) {
  const [localClaimed, setLocalClaimed] = useState<Set<string>>(() => new Set(claimedIds))
  // Items this browser claimed → undo token (null when the claim can't be undone).
  const [mine,         setMine]         = useState<Record<string, string | null>>({})
  const [justClaimed,  setJustClaimed]  = useState<Set<string>>(new Set())
  // Items another gifter claimed while the page was open: their title gets the live strike-through.
  const [liveFresh,    setLiveFresh]    = useState<Set<string>>(new Set())
  const [lastClaimed,  setLastClaimed]  = useState<string | null>(null)
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set())
  const [undoError,    setUndoError]    = useState<{ id: string; message: string } | null>(null)
  const [undoPending,  startUndo]       = useTransition()
  const prevClaimed = useRef<Set<string> | null>(null)
  const claimedRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Server refreshes (live claims) carry the authoritative set; follow them.
  useEffect(() => {
    const prev = prevClaimed.current
    prevClaimed.current = new Set(claimedIds)
    setLocalClaimed(new Set(claimedIds))
    if (!prev) return
    const added = claimedIds.filter(id => !prev.has(id))
    if (added.length) setLiveFresh(new Set(added))
  }, [claimedIds])

  // Tokens for whole claims and for pledges, which don't mark the item as claimed.
  useEffect(() => {
    const found: Record<string, string> = {}
    for (const { id } of items) {
      const token = readToken(id)
      if (token) found[id] = token
    }
    if (Object.keys(found).length) setMine(prev => ({ ...found, ...prev }))
  }, [items])

  // The claim button unmounts on success, so focus moves to the thank-you card instead of falling to <body>.
  useEffect(() => {
    if (lastClaimed) claimedRefs.current[lastClaimed]?.focus()
  }, [lastClaimed])

  const handleClaimed = useCallback((itemId: string, releaseToken: string | null) => {
    writeToken(itemId, releaseToken)
    setLocalClaimed(prev => new Set([...prev, itemId]))
    setMine(prev => ({ ...prev, [itemId]: releaseToken }))
    setJustClaimed(prev => new Set([...prev, itemId]))
    setLastClaimed(itemId)
  }, [])

  // A pledge keeps the item open for others: only the undo token is kept, not a claimed state.
  const handlePledged = useCallback((itemId: string, releaseToken: string | null) => {
    if (releaseToken) writeToken(itemId, releaseToken)
    setMine(prev => ({ ...prev, [itemId]: releaseToken }))
  }, [])

  const handleUndo = (itemId: string) => {
    const token = mine[itemId]
    if (!token) return
    setUndoError(null)
    startUndo(async () => {
      const res = await releaseClaim(itemId, token)
      if (res.error) {
        setUndoError({ id: itemId, message: res.error })
        return
      }
      writeToken(itemId, null)
      setLocalClaimed(prev => { const next = new Set(prev); next.delete(itemId); return next })
      setMine(prev => { const next = { ...prev }; delete next[itemId]; return next })
      setJustClaimed(prev => { const next = new Set(prev); next.delete(itemId); return next })
      setLastClaimed(null)
    })
  }

  const claimedSet = localClaimed
  const available  = items.length - localClaimed.size

  return (
    <div>
      {/* Stats bar — updates in real time as items are claimed. Hidden in the owner's surprise view. */}
      {!ownerSurpriseView && (
        <div role="status" aria-live="polite" style={{
          display: 'flex', gap: 20, padding: '10px 14px', marginBottom: 16,
          background: 'var(--yellow)', border: '2px solid var(--ink)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div>
            <div className="rg-mono" style={{ fontSize: 9, marginBottom: 1 }}>DISPONIBLES</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1 }}>{available}</div>
          </div>
          <div style={{ width: 2, background: 'var(--ink)' }} />
          <div>
            <div className="rg-mono" style={{ fontSize: 9, marginBottom: 1 }}>RECLAMADOS</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1 }}>{localClaimed.size}</div>
          </div>
        </div>
      )}

    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item) => {
        const claimed     = claimedSet.has(item.id)
        const isMine      = item.id in mine
        const isJust      = justClaimed.has(item.id)
        const strikeLive  = liveFresh.has(item.id) && !isJust
        const showImage   = /^https?:\/\//i.test(item.image_url ?? '') && !brokenImages.has(item.id)
        const raisedSoFar = raised[item.id] ?? 0
        const remaining   = item.price ? Math.ceil(item.price - raisedSoFar) : 0

        return (
          <article key={item.id} aria-label={`${item.title}${claimed ? ', reclamado' : ', disponible'}`}
            className={isJust ? 'rg-thud' : undefined}
            style={{
              padding: 16,
              background: claimed ? 'rgba(15,15,15,0.04)' : 'var(--paper)',
              border: `2px solid ${claimed ? 'rgba(15,15,15,0.25)' : 'var(--ink)'}`,
              boxShadow: claimed ? 'none' : 'var(--shadow-sm)',
              position: 'relative',
            }}>
            {claimed ? (
              <div
                ref={(el) => { claimedRefs.current[item.id] = el }}
                role={isJust ? 'status' : undefined}
                tabIndex={isJust ? -1 : undefined}
              >
                {isJust && <Confetti />}
                <span className={`rg-sticker rg-sticker-green${isJust ? ' is-stamped' : ''}`} style={{ fontSize: 9, marginBottom: 6, display: 'inline-block' }}>
                  {isJust ? '✓ TE ENCARGÁS VOS' : isMine ? '✓ LO RECLAMASTE VOS' : '✓ RECLAMADO'}
                </span>
                <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.45)', margin: 0, textDecoration: strikeLive ? 'none' : 'line-through' }}>
                  <span className={strikeLive ? 'rg-strike' : undefined}>{item.title}</span>
                </p>
                {item.price && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(15,15,15,0.35)', marginTop: 3 }}>
                    ~{currency} {formatPrice(item.price, currency)}
                  </p>
                )}
                {isMine && mine[item.id] && (
                  <button
                    type="button"
                    onClick={() => handleUndo(item.id)}
                    disabled={undoPending}
                    className="rg-mono"
                    style={{
                      background: 'none', border: 'none', cursor: undoPending ? 'default' : 'pointer',
                      fontSize: 10, color: 'var(--ink)', marginTop: 8,
                      padding: '6px 0', textDecoration: 'underline', minHeight: 32,
                    }}
                  >
                    {undoPending ? '...' : '¿TE EQUIVOCASTE? DESHACER'}
                  </button>
                )}
                {undoError?.id === item.id && (
                  <p style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, margin: '4px 0 0' }}>{undoError.message}</p>
                )}
                {isJust && (
                  <a
                    href="/auth?mode=signup"
                    style={{
                      display: 'block', padding: '12px 14px', marginTop: 10,
                      background: 'var(--yellow)', border: '2px solid var(--ink)', boxShadow: 'var(--shadow-sm)',
                      fontSize: 11, fontFamily: 'var(--font-display)', textDecoration: 'none', color: 'var(--ink)',
                      textTransform: 'uppercase', letterSpacing: -0.3,
                    }}
                  >
                    ¡GRACIAS! ¿TENÉS UN CUMPLE PRÓXIMAMENTE?<br />
                    <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 10 }}>
                      Armá tu lista en 2 min →
                    </span>
                  </a>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {showImage ? (
                  <img
                    src={item.image_url!}
                    alt=""
                    width={80}
                    height={80}
                    loading="lazy"
                    decoding="async"
                    style={{ width: 80, height: 80, objectFit: 'cover', border: '2px solid var(--ink)', flexShrink: 0 }}
                    onError={() => setBrokenImages(prev => new Set([...prev, item.id]))}
                  />
                ) : (
                  <div className="rg-img-ph" aria-hidden="true" style={{
                    width: 80, height: 80, flexShrink: 0,
                    fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)',
                  }}>
                    {item.title.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <p style={{ fontWeight: 800, fontSize: 15, margin: 0, lineHeight: 1.3 }}>{item.title}</p>
                    {item.priority === 3 && (
                      <span className="rg-sticker rg-sticker-red" style={{ fontSize: 8, flexShrink: 0 }}>ESENCIAL</span>
                    )}
                    {item.priority === 2 && (
                      <span className="rg-sticker" style={{ fontSize: 8, flexShrink: 0 }}>ME GUSTA</span>
                    )}
                  </div>
                  {item.description && (
                    <p style={{ fontSize: 12, color: 'rgba(15,15,15,0.65)', margin: '0 0 8px 0', lineHeight: 1.45 }}>
                      {item.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
                    {item.price ? (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}>
                        ~{currency} {formatPrice(item.price, currency)}
                      </div>
                    ) : <div />}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      {/^https?:\/\//i.test(item.url ?? '') && (
                        <a href={item.url!} target="_blank" rel="noopener noreferrer"
                          className="rg-btn rg-btn-ghost"
                          style={{ padding: '7px 12px', fontSize: 11 }}>
                          VER PRODUCTO
                        </a>
                      )}
                      {!ownerSurpriseView && <ClaimButton itemId={item.id} onClaimed={handleClaimed} />}
                    </div>
                  </div>
                  {sharesOpen && !ownerSurpriseView && item.price && remaining > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '2px dashed var(--ink)' }}>
                      <p className="rg-mono" style={{ fontSize: 9, margin: '0 0 6px' }}>
                        REGALO COMPARTIDO · {formatPrice(raisedSoFar, currency)} DE {formatPrice(item.price, currency)}
                      </p>
                      <div
                        role="progressbar"
                        aria-label="Lo juntado para este regalo"
                        aria-valuemin={0}
                        aria-valuemax={item.price}
                        aria-valuenow={Math.min(raisedSoFar, item.price)}
                        aria-valuetext={`${formatPrice(raisedSoFar, currency)} de ${formatPrice(item.price, currency)}`}
                        style={{ height: 8, border: '2px solid var(--ink)', background: 'var(--paper)', marginBottom: 8 }}
                      >
                        <div style={{ height: '100%', width: `${Math.min(100, (raisedSoFar / item.price) * 100)}%`, background: 'var(--green)' }} />
                      </div>
                      <PledgeButton
                        itemId={item.id}
                        remaining={remaining}
                        currency={currency}
                        onPledged={handlePledged}
                      />
                      {mine[item.id] && (
                        <button
                          type="button"
                          onClick={() => handleUndo(item.id)}
                          disabled={undoPending}
                          className="rg-mono"
                          style={{
                            background: 'none', border: 'none', cursor: undoPending ? 'default' : 'pointer',
                            fontSize: 10, color: 'var(--ink)', marginTop: 8,
                            padding: '6px 0', textDecoration: 'underline', minHeight: 32, display: 'block',
                          }}
                        >
                          {undoPending ? '...' : '¿TE EQUIVOCASTE CON TU APORTE? DESHACER'}
                        </button>
                      )}
                      {undoError?.id === item.id && (
                        <p style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, margin: '4px 0 0' }}>{undoError.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </article>
        )
      })}
    </div>
  </div>
  )
}

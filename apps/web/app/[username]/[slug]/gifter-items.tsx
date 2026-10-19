'use client'

import { useState, useCallback, useEffect, useTransition } from 'react'
import type { Item } from 'shared'
import ClaimButton from './claim-button'
import { releaseClaim } from './actions'

type Props = {
  items: Item[]
  claimedIds: string[]
  currency: string
  // Owner looking at their own surprise list: the server sends no claim data, so hide claim UI too.
  ownerSurpriseView: boolean
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

export default function GifterItems({ items, claimedIds, currency, ownerSurpriseView }: Props) {
  const [localClaimed, setLocalClaimed] = useState<Set<string>>(() => new Set(claimedIds))
  // Items this browser claimed → undo token (null when the claim can't be undone).
  const [mine,         setMine]         = useState<Record<string, string | null>>({})
  const [justClaimed,  setJustClaimed]  = useState<Set<string>>(new Set())
  const [undoError,    setUndoError]    = useState<{ id: string; message: string } | null>(null)
  const [undoPending,  startUndo]       = useTransition()

  useEffect(() => {
    const found: Record<string, string> = {}
    for (const id of claimedIds) {
      const token = readToken(id)
      if (token) found[id] = token
    }
    if (Object.keys(found).length) setMine(prev => ({ ...found, ...prev }))
  }, [claimedIds])

  const handleClaimed = useCallback((itemId: string, releaseToken: string | null) => {
    writeToken(itemId, releaseToken)
    setLocalClaimed(prev => new Set([...prev, itemId]))
    setMine(prev => ({ ...prev, [itemId]: releaseToken }))
    setJustClaimed(prev => new Set([...prev, itemId]))
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
    })
  }

  const claimedSet = localClaimed
  const available  = items.length - localClaimed.size

  return (
    <div>
      {/* Stats bar — updates in real time as items are claimed. Hidden in the owner's surprise view. */}
      {!ownerSurpriseView && (
        <div style={{
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
        const claimed = claimedSet.has(item.id)
        const isMine  = item.id in mine

        return (
          <article key={item.id} aria-label={`${item.title}${claimed ? ', reclamado' : ', disponible'}`} style={{
            padding: 16,
            background: claimed ? 'rgba(15,15,15,0.04)' : 'var(--paper)',
            border: `2px solid ${claimed ? 'rgba(15,15,15,0.25)' : 'var(--ink)'}`,
            boxShadow: claimed ? 'none' : 'var(--shadow-sm)',
            position: 'relative',
          }}>
            {claimed ? (
              <div>
                <span className="rg-sticker rg-sticker-green" style={{ fontSize: 9, marginBottom: 6, display: 'inline-block' }}>
                  {isMine ? '✓ LO RECLAMASTE VOS' : '✓ RECLAMADO'}
                </span>
                <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.45)', textDecoration: 'line-through', margin: 0 }}>
                  {item.title}
                </p>
                {item.price && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(15,15,15,0.35)', marginTop: 3 }}>
                    ~{currency} {item.price.toLocaleString('es-AR')}
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
                {justClaimed.has(item.id) && (
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
                {/^https?:\/\//i.test(item.image_url ?? '') && (
                  <img
                    src={item.image_url!}
                    alt=""
                    style={{ width: 80, height: 80, objectFit: 'cover', border: '2px solid var(--ink)', flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
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
                        ~{currency} {item.price.toLocaleString('es-AR')}
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

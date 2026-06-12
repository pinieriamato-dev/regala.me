'use client'

import { useState, useCallback } from 'react'
import type { Item } from 'shared'
import ClaimButton from './claim-button'

type Props = {
  items: Item[]
  claimedIds: string[]
  currency: string
  isOwnerSurpriseView: boolean
  listIsSurprise: boolean
}

export default function GifterItems({ items, claimedIds, currency, isOwnerSurpriseView, listIsSurprise }: Props) {
  const [revealedIds,   setRevealedIds]   = useState<Set<string>>(new Set())
  const [localClaimed,  setLocalClaimed]  = useState<Set<string>>(() => new Set(claimedIds))

  const handleClaimed = useCallback((itemId: string) => {
    setLocalClaimed(prev => new Set([...prev, itemId]))
  }, [])

  const claimedSet = localClaimed
  const available  = items.length - localClaimed.size

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div>
      {/* Stats bar — updates in real time as items are claimed */}
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

    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item) => {
        const claimed = claimedSet.has(item.id)
        const blurred = isOwnerSurpriseView && claimed && !revealedIds.has(item.id)

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
                  ✓ RECLAMADO
                </span>
                <div style={{
                  filter: blurred ? 'blur(6px)' : 'none',
                  userSelect: blurred ? 'none' : 'auto',
                  transition: 'filter 0.2s',
                }}>
                  <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.45)', textDecoration: 'line-through', margin: 0 }}>
                    {item.title}
                  </p>
                  {item.price && (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(15,15,15,0.35)', marginTop: 3 }}>
                      ~{currency} {item.price.toLocaleString('es-AR')}
                    </p>
                  )}
                </div>
                {isOwnerSurpriseView && (
                  <button
                    onClick={() => toggleReveal(item.id)}
                    className="rg-mono"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 9, color: 'rgba(15,15,15,0.45)', marginTop: 6,
                      padding: 0, textDecoration: 'underline',
                    }}
                  >
                    {blurred ? '¿VER DE TODOS MODOS?' : 'OCULTAR'}
                  </button>
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
                      <ClaimButton itemId={item.id} listIsSurprise={listIsSurprise} onClaimed={handleClaimed} />
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

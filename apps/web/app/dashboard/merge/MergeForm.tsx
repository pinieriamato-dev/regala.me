'use client'

import { useState, useTransition } from 'react'
import { mergeWishlists } from '@/app/dashboard/actions'
import { occasionEmoji } from 'shared'
import type { OccasionId } from 'shared'

export type ListSummary = {
  id: string
  title: string
  occasion: string | null
  is_default: boolean
  items: { id: string }[]
}

export default function MergeForm({ lists }: { lists: ListSummary[] }) {
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const source = lists.find(l => l.id === sourceId)
  const target = lists.find(l => l.id === targetId)
  const canMerge = !!(sourceId && targetId && sourceId !== targetId)

  const handleMerge = () => {
    if (!canMerge) return
    setError(null)
    startTransition(async () => {
      // On success the action redirects to the merged list, so we only come back here on failure.
      const res = await mergeWishlists(sourceId!, targetId!)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Info banner */}
      <div className="rg-card-yellow" style={{ padding: '14px 18px' }}>
        <p className="rg-mono" style={{ fontSize: 10, margin: 0 }}>
          TODOS LOS ÍTEMS DE LA LISTA A SE MUEVEN A LA LISTA B. LA LISTA A DESAPARECE. ESTA ACCIÓN NO SE PUEDE DESHACER.
        </p>
      </div>

      {/* Two-column selector */}
      <div className="rg-merge-grid">
        {/* Source */}
        <div>
          <div className="rg-mono" style={{ fontSize: 10, marginBottom: 12, color: 'rgba(15,15,15,0.6)' }}>
            1. ELEGÍ LA LISTA QUE SE DISUELVE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lists.map(list => {
              const isSelected  = sourceId === list.id
              const isDisabled  = targetId === list.id || list.is_default
              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => setSourceId(isSelected ? null : list.id)}
                  disabled={isDisabled}
                  style={{
                    padding: '14px 16px', textAlign: 'left', borderRadius: 4, cursor: isDisabled ? 'not-allowed' : 'pointer',
                    background: isSelected ? 'var(--ink)' : isDisabled ? 'rgba(15,15,15,0.04)' : 'var(--paper)',
                    color:      isSelected ? 'var(--paper)' : isDisabled ? 'rgba(15,15,15,0.25)' : 'var(--ink)',
                    border:    `2px solid ${isDisabled ? 'rgba(15,15,15,0.12)' : 'var(--ink)'}`,
                    boxShadow:  isSelected ? '3px 3px 0 0 var(--red)' : isDisabled ? 'none' : '3px 3px 0 0 var(--ink)',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 13 }}>
                    {occasionEmoji(list.occasion as OccasionId)} {list.title}
                  </div>
                  <div className="rg-mono" style={{ fontSize: 9, marginTop: 4, opacity: 0.6 }}>
                    {list.items.length} ÍTEM{list.items.length !== 1 ? 'S' : ''}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Arrow */}
        <div aria-hidden="true" className="rg-merge-arrow" style={{
          color: canMerge ? 'var(--ink)' : 'rgba(15,15,15,0.2)', transition: 'color 0.15s',
        }}>→</div>

        {/* Target */}
        <div>
          <div className="rg-mono" style={{ fontSize: 10, marginBottom: 12, color: 'rgba(15,15,15,0.6)' }}>
            2. ¿A CUÁL VAN LOS ÍTEMS?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lists.map(list => {
              const isSelected  = targetId === list.id
              const isDisabled  = sourceId === list.id
              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => setTargetId(isSelected ? null : list.id)}
                  disabled={isDisabled}
                  style={{
                    padding: '14px 16px', textAlign: 'left', borderRadius: 4, cursor: isDisabled ? 'not-allowed' : 'pointer',
                    background: isSelected ? 'var(--ink)' : isDisabled ? 'rgba(15,15,15,0.04)' : 'var(--paper)',
                    color:      isSelected ? 'var(--paper)' : isDisabled ? 'rgba(15,15,15,0.25)' : 'var(--ink)',
                    border:    `2px solid ${isDisabled ? 'rgba(15,15,15,0.12)' : 'var(--ink)'}`,
                    boxShadow:  isSelected ? '3px 3px 0 0 var(--green)' : isDisabled ? 'none' : '3px 3px 0 0 var(--ink)',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 13 }}>
                    {occasionEmoji(list.occasion as OccasionId)} {list.title}
                  </div>
                  <div className="rg-mono" style={{ fontSize: 9, marginTop: 4, opacity: 0.6 }}>
                    {list.items.length} ÍTEM{list.items.length !== 1 ? 'S' : ''}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Result preview */}
      {canMerge && source && target && (
        <div className="rg-card-ink" style={{ padding: '18px 20px' }}>
          <div className="rg-mono" style={{ fontSize: 9, color: 'rgba(251,248,238,0.5)', marginBottom: 8 }}>RESULTADO</div>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--paper)' }}>
            {occasionEmoji(target.occasion as OccasionId)} {target.title}
          </div>
          <div className="rg-mono" style={{ fontSize: 10, color: 'rgba(251,248,238,0.5)', marginTop: 4 }}>
            {source.items.length + target.items.length} ÍTEMS EN TOTAL — {source.title.toUpperCase()} DESAPARECE
          </div>
        </div>
      )}

      {error && (
        <p role="alert" style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700, margin: 0 }}>{error}</p>
      )}

      <button
        type="button"
        onClick={handleMerge}
        disabled={!canMerge || pending}
        className="rg-btn rg-btn-primary"
        style={{ width: '100%', padding: '16px', fontSize: 14, opacity: (!canMerge || pending) ? 0.4 : 1 }}
      >
        {pending ? 'COMBINANDO...' : 'COMBINAR LISTAS →'}
      </button>
    </div>
  )
}

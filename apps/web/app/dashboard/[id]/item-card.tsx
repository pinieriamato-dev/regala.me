'use client'

import { useState, useTransition } from 'react'
import { deleteItem, editItem } from '@/app/dashboard/actions'
import type { Item, Priority } from 'shared'

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 1, label: 'OPCIONAL' },
  { value: 2, label: 'ME GUSTA' },
  { value: 3, label: 'ESENCIAL' },
]

type Props = {
  item: Item
  claimer: string | null
  listId: string
  currency: string
  isSurprise: boolean
}

export default function ItemCard({ item, claimer, listId, currency, isSurprise }: Props) {
  const [hidden,  setHidden]  = useState(false)
  const [editing, setEditing] = useState(false)
  const [deletePending, startDeleteTransition] = useTransition()

  if (hidden) return null

  // For surprise lists the owner sees all items as unclaimed — no spoilers.
  const displayedClaimer = isSurprise ? null : claimer
  const isClaimed        = !!displayedClaimer

  const handleDelete = () => {
    setHidden(true)
    startDeleteTransition(async () => {
      await deleteItem(item.id, listId)
    })
  }

  if (editing) {
    return (
      <EditForm
        item={item}
        listId={listId}
        currency={currency}
        onCancel={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    )
  }

  return (
    <div
      className="rg-card"
      style={{
        padding: '14px 16px',
        opacity: isClaimed ? 0.7 : 1,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <p style={{
            fontWeight: 800, fontSize: 14, margin: 0,
            textDecoration: isClaimed ? 'line-through' : 'none',
            color: isClaimed ? 'rgba(15,15,15,0.5)' : 'var(--ink)',
          }}>
            {item.title}
          </p>
          {isClaimed && (
            <span className="rg-sticker rg-sticker-green" style={{ fontSize: 8 }}>✓ {displayedClaimer}</span>
          )}
          {!isClaimed && item.priority === 3 && (
            <span className="rg-sticker rg-sticker-red" style={{ fontSize: 8 }}>ESENCIAL</span>
          )}
          {!isClaimed && item.priority === 2 && (
            <span className="rg-sticker" style={{ fontSize: 8 }}>ME GUSTA</span>
          )}
        </div>
        {item.description && (
          <p style={{ fontSize: 12, color: 'rgba(15,15,15,0.6)', margin: '0 0 6px 0', lineHeight: 1.4 }}>
            {item.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          {item.price && (
            <span className="rg-mono" style={{ fontSize: 10 }}>
              ~{currency} {item.price.toLocaleString('es-AR')}
            </span>
          )}
          {/^https?:\/\//i.test(item.url ?? '') && (
            <a href={item.url!} target="_blank" rel="noopener noreferrer"
              className="rg-mono" style={{ fontSize: 10, color: 'var(--red)', textDecoration: 'none' }}>
              VER PRODUCTO →
            </a>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
        <button
          onClick={() => setEditing(true)}
          className="rg-mono"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 9,
            color: 'rgba(15,15,15,0.4)', padding: '4px 6px', letterSpacing: 0.5,
          }}
        >
          EDITAR
        </button>
        <button
          onClick={handleDelete}
          disabled={deletePending}
          style={{
            background: 'none', border: 'none',
            cursor: deletePending ? 'default' : 'pointer',
            fontFamily: 'var(--font-display)', fontSize: 18,
            color: deletePending ? 'rgba(15,15,15,0.15)' : 'rgba(15,15,15,0.3)',
            lineHeight: 1, padding: '4px 6px',
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

function EditForm({
  item,
  listId,
  currency,
  onCancel,
  onSaved,
}: {
  item: Item
  listId: string
  currency: string
  onCancel: () => void
  onSaved: () => void
}) {
  const [priority, setPriority] = useState(item.priority ?? 1)
  const [pending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('priority', String(priority))
    startTransition(async () => {
      await editItem(item.id, listId, fd)
      onSaved()
    })
  }

  return (
    <div
      className="rg-card"
      style={{ padding: '14px 16px', borderColor: 'var(--yellow)', boxShadow: '3px 3px 0 0 var(--yellow)' }}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="rg-mono" style={{ fontSize: 9, marginBottom: 2, color: 'rgba(15,15,15,0.6)' }}>
          EDITANDO ÍTEM
        </div>
        {/* Preserve image_url silently */}
        <input type="hidden" name="image_url" value={item.image_url ?? ''} />
        <input
          name="title"
          type="text"
          defaultValue={item.title}
          required
          className="rg-input"
          style={{ fontSize: 13 }}
          placeholder="Nombre del regalo *"
        />
        <input
          name="description"
          type="text"
          defaultValue={item.description ?? ''}
          className="rg-input"
          style={{ fontSize: 13 }}
          placeholder="Descripción (opcional)"
        />
        <input
          name="price"
          type="text"
          inputMode="decimal"
          defaultValue={item.price ? String(Math.round(item.price)) : ''}
          className="rg-input"
          style={{ fontSize: 13 }}
          placeholder={`Precio en ${currency} (opcional)`}
        />
        <input
          name="url"
          type="url"
          defaultValue={item.url ?? ''}
          className="rg-input"
          style={{ fontSize: 13 }}
          placeholder="Link al producto (opcional)"
        />
        <div>
          <div className="rg-mono" style={{ fontSize: 9, marginBottom: 6, color: 'rgba(15,15,15,0.6)' }}>
            PRIORIDAD
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className="rg-btn"
                style={{
                  flex: 1, padding: '6px', fontSize: 9,
                  background: priority === p.value ? 'var(--ink)' : 'var(--paper)',
                  color: priority === p.value ? 'var(--paper)' : 'var(--ink)',
                  border: '2px solid var(--ink)',
                  boxShadow: priority === p.value ? '2px 2px 0 0 var(--ink)' : 'none',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onCancel}
            className="rg-btn rg-btn-ghost"
            style={{ flex: 1, padding: '10px', fontSize: 11 }}
          >
            CANCELAR
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rg-btn rg-btn-primary"
            style={{ flex: 1, padding: '10px', fontSize: 11, opacity: pending ? 0.6 : 1 }}
          >
            {pending ? '...' : 'GUARDAR'}
          </button>
        </div>
      </form>
    </div>
  )
}

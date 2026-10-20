'use client'

import { useRef, useState, useTransition } from 'react'
import { deleteItem, editItem, moveItem, releaseClaim } from '@/app/dashboard/actions'
import { formatPrice, type Item, type Priority } from 'shared'
import ConfirmPanel from '@/components/ConfirmPanel'
import ItemImageField from './item-image-field'

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
  canMoveUp: boolean
  canMoveDown: boolean
}

export default function ItemCard({ item, claimer, listId, currency, isSurprise, canMoveUp, canMoveDown }: Props) {
  const [hidden,  setHidden]  = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState<'delete' | 'release' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()
  const [releasePending, startReleaseTransition] = useTransition()
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const releaseButtonRef = useRef<HTMLButtonElement>(null)

  if (hidden) return null

  // Surprise lists: the page doesn't fetch claims at all, so `claimer` is already null; this is a backstop.
  const displayedClaimer = isSurprise ? null : claimer
  const isClaimed        = !!displayedClaimer

  const handleDelete = () => {
    setConfirming(null)
    setHidden(true)
    startDeleteTransition(async () => {
      await deleteItem(item.id, listId)
    })
  }

  const handleRelease = () => {
    setConfirming(null)
    setActionError(null)
    startReleaseTransition(async () => {
      const res = await releaseClaim(item.id, listId)
      if (res.error) setActionError(res.error)
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
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/^https?:\/\//i.test(item.image_url ?? '') && (
          <img
            src={item.image_url!}
            alt=""
            style={{ width: 56, height: 56, objectFit: 'cover', border: '2px solid var(--ink)', flexShrink: 0 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
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
            {isClaimed && (
              <button
                ref={releaseButtonRef}
                type="button"
                onClick={() => setConfirming('release')}
                disabled={releasePending}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 11,
                  fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: 'rgba(15,15,15,0.55)', minHeight: 44, padding: '0 6px', textDecoration: 'underline',
                }}
              >
                {releasePending ? '...' : 'LIBERAR'}
              </button>
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
                ~{currency} {formatPrice(item.price, currency)}
              </span>
            )}
            {/^https?:\/\//i.test(item.url ?? '') && (
              <a href={item.url!} target="_blank" rel="noopener noreferrer"
                className="rg-mono" style={{ fontSize: 10, color: 'var(--red)', textDecoration: 'none' }}>
                VER PRODUCTO →
              </a>
            )}
          </div>
          {confirming && (
            <ConfirmPanel
              message={
                confirming === 'delete'
                  ? isClaimed
                    ? `¿BORRAR ESTE ÍTEM? ${displayedClaimer?.toUpperCase()} YA LO RECLAMÓ.`
                    : isSurprise
                      ? '¿BORRAR ESTE ÍTEM? SI ALGUIEN LO RECLAMÓ, SE PIERDE.'
                      : '¿BORRAR ESTE ÍTEM? NO SE PUEDE DESHACER.'
                  : `¿LIBERAR? ${displayedClaimer?.toUpperCase()} YA NO LO VA A TENER RECLAMADO.`
              }
              confirmLabel={confirming === 'delete' ? 'SÍ, BORRAR' : 'SÍ, LIBERAR'}
              onConfirm={confirming === 'delete' ? handleDelete : handleRelease}
              onCancel={() => setConfirming(null)}
              returnFocusRef={confirming === 'delete' ? deleteButtonRef : releaseButtonRef}
            />
          )}
          {actionError && (
            <p style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, margin: '6px 0 0' }}>{actionError}</p>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '2px dashed var(--ink)' }}>
        {(['up', 'down'] as const).map((direction) => {
          const enabled = direction === 'up' ? canMoveUp : canMoveDown
          return (
            <button
              key={direction}
              type="button"
              disabled={!enabled}
              onClick={() => moveItem(item.id, listId, direction)}
              aria-label={direction === 'up' ? `Subir ${item.title}` : `Bajar ${item.title}`}
              style={{
                minWidth: 44, minHeight: 44, display: 'inline-grid', placeItems: 'center',
                background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: 4,
                boxShadow: enabled ? 'var(--shadow-sm)' : 'none',
                opacity: enabled ? 1 : 0.35,
                cursor: enabled ? 'pointer' : 'default',
                fontFamily: 'var(--font-display)', fontSize: 12, lineHeight: 1, color: 'var(--ink)',
              }}
            >
              {direction === 'up' ? '▲' : '▼'}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rg-btn rg-btn-ghost"
          style={{ flex: 1, minHeight: 44, padding: '0 12px', fontSize: 11 }}
        >
          EDITAR
        </button>
        <button
          ref={deleteButtonRef}
          type="button"
          onClick={() => setConfirming('delete')}
          disabled={deletePending}
          aria-label={`Borrar ${item.title}`}
          className="rg-btn rg-btn-ghost"
          style={{ minHeight: 44, padding: '0 12px', fontSize: 11, opacity: deletePending ? 0.5 : 1 }}
        >
          BORRAR
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
    <div className="rg-card" style={{ padding: 0, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
      <div
        className="rg-mono"
        style={{ padding: '6px 16px', background: 'var(--yellow)', borderBottom: '2px solid var(--ink)', color: 'var(--ink)', fontSize: 11 }}
      >
        EDITANDO ÍTEM
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px' }}>
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
          // es-AR decimal comma so addItemSchema parses it back unchanged (12345.5 → "12345,5")
          defaultValue={item.price ? String(item.price).replace('.', ',') : ''}
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
        <ItemImageField defaultValue={item.image_url} />
        <div>
          <div className="rg-mono" style={{ fontSize: 9, marginBottom: 6, color: 'rgba(15,15,15,0.6)' }}>
            PRIORIDAD
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                aria-pressed={priority === p.value}
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

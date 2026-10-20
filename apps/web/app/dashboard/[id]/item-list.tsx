'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { moveItem } from '@/app/dashboard/actions'
import type { Item } from 'shared'
import ItemCard from './item-card'

type Direction = 'up' | 'down'
type Move = { id: string; direction: Direction }

type Props = {
  items: Item[]
  claims: Record<string, string>
  listId: string
  currency: string
  isSurprise: boolean
}

// Swap the item with its neighbour. Runs instantly on the client; the server confirms and revalidates after.
function applyMove(items: Item[], { id, direction }: Move): Item[] {
  const index = items.findIndex(item => item.id === id)
  const swapWith = direction === 'up' ? index - 1 : index + 1
  if (index === -1 || swapWith < 0 || swapWith >= items.length) return items
  const next = [...items]
  ;[next[index], next[swapWith]] = [next[swapWith], next[index]]
  return next
}

export default function ItemList({ items, claims, listId, currency, isSurprise }: Props) {
  const [optimisticItems, moveOptimistically] = useOptimistic(items, applyMove)
  const [, startTransition] = useTransition()
  const [movedId, setMovedId] = useState<string | null>(null)

  const handleMove = (id: string, direction: Direction) => {
    setMovedId(id)
    startTransition(async () => {
      moveOptimistically({ id, direction })
      await moveItem(id, listId, direction)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {optimisticItems.map((item, index) => (
        <div key={item.id} className={item.id === movedId ? 'rg-nudge' : undefined}>
          <ItemCard
            item={item}
            claimer={claims[item.id] ?? null}
            listId={listId}
            currency={currency}
            isSurprise={isSurprise}
            canMoveUp={index > 0}
            canMoveDown={index < optimisticItems.length - 1}
            onMove={direction => handleMove(item.id, direction)}
          />
        </div>
      ))}
    </div>
  )
}

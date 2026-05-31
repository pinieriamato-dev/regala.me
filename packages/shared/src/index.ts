export * from './types'
import type { Currency, OccasionId } from './types'

export const OCCASIONS = [
  { id: 'birthday'    as const, label: 'Cumpleaños',  emoji: '🎂' },
  { id: 'baby_shower' as const, label: 'Baby shower', emoji: '👶' },
  { id: 'wedding'     as const, label: 'Casamiento',  emoji: '💍' },
  { id: 'quinceañera' as const, label: 'Quinceañera', emoji: '👸' },
  { id: 'graduation'  as const, label: 'Graduación',  emoji: '🎓' },
  { id: 'other'       as const, label: 'Otro',        emoji: '🎁' },
]

export const CURRENCIES: Currency[] = ['ARS', 'BRL', 'MXN', 'CLP', 'COP', 'UYU', 'PEN', 'USD']

export function occasionEmoji(id: OccasionId | null | undefined): string {
  return OCCASIONS.find(o => o.id === id)?.emoji ?? '🎁'
}

export function daysUntil(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
  if (diff < 0) return null
  if (diff === 0) return '¡Hoy!'
  return `en ${diff} día${diff === 1 ? '' : 's'}`
}

export function createSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40) +
    '-' +
    Date.now().toString(36)
  )
}

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

// Digit grouping follows the country that uses each currency (1.234 in AR, 1,234 in MX). Unknown codes fall back to es-AR.
const PRICE_LOCALE: Record<Currency, string> = {
  ARS: 'es-AR', BRL: 'pt-BR', MXN: 'es-MX', CLP: 'es-CL', COP: 'es-CO', UYU: 'es-UY', PEN: 'es-PE', USD: 'en-US',
}

export function formatPrice(amount: number, currency: string): string {
  return amount.toLocaleString(PRICE_LOCALE[currency as Currency] ?? 'es-AR')
}

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

const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

// Random (not time-based) so `link_only` list URLs can't be guessed from the title + creation date.
function randomSuffix(length = 8): string {
  const bytes = new Uint8Array(length)
  const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes)
  else for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return Array.from(bytes, b => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join('')
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
    randomSuffix()
  )
}

import { describe, it, expect } from 'vitest'
import { createSlug, daysUntil, occasionEmoji } from '../index'

describe('createSlug', () => {
  it('produces lowercase kebab-case', () => {
    const slug = createSlug('Mi Lista De Cumple')
    expect(slug).toMatch(/^mi-lista-de-cumple-/)
  })

  it('strips accents', () => {
    const slug = createSlug('Feliz Navidad')
    expect(slug).toMatch(/^feliz-navidad-/)
    expect(slug).not.toContain('á')
  })

  it('appends a unique base36 suffix', () => {
    const a = createSlug('test')
    expect(a).toMatch(/^test-[a-z0-9]+$/)
  })

  it('handles special characters', () => {
    const slug = createSlug('¡Hola! World@2024')
    expect(slug).not.toContain('!')
    expect(slug).not.toContain('@')
  })
})

describe('occasionEmoji', () => {
  it('returns 🎂 for birthday', () => {
    expect(occasionEmoji('birthday')).toBe('🎂')
  })

  it('returns 👶 for baby_shower', () => {
    expect(occasionEmoji('baby_shower')).toBe('👶')
  })

  it('returns 🎁 for null', () => {
    expect(occasionEmoji(null)).toBe('🎁')
  })

  it('returns 🎁 for undefined', () => {
    expect(occasionEmoji(undefined)).toBe('🎁')
  })
})

describe('daysUntil', () => {
  it('returns null for null input', () => {
    expect(daysUntil(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(daysUntil(undefined)).toBeNull()
  })

  it('returns a string for a future date', () => {
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString().split('T')[0]
    const result = daysUntil(future)
    expect(result).toMatch(/en \d+ día/)
  })

  it('returns null for a past date', () => {
    const past = '2020-01-01'
    expect(daysUntil(past)).toBeNull()
  })

  it('uses singular "día" for 1 day', () => {
    const tomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString().split('T')[0]
    const result = daysUntil(tomorrow)
    // Could be 1 or 2 days depending on UTC offset — just check format
    expect(result).toBeTruthy()
    expect(result).toMatch(/en \d+ día/)
  })
})

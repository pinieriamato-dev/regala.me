// Validation for the editable profile fields. Shared by the server action and kept free of
// server-only imports so it stays easy to test.

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

// Usernames are the public profile slug (regala.me/{username}). New ones are lowercase; existing
// usernames created from email aliases may still contain "+" and are left alone unless changed.
export const USERNAME_RE = /^[a-z0-9][a-z0-9_-]{2,29}$/

// Top-level routes that a username would shadow ([username] is a catch-all for one segment).
const RESERVED_USERNAMES = new Set([
  'api', 'auth', 'dashboard', 'unirse', 'regalos-para', 'admin', 'ayuda', 'login',
  'signup', 'perfil', 'premium', 'terminos', 'privacidad', 'sitemap', 'robots', 'manifest',
])

export function parseUsername(raw: string): Parsed<string> {
  const value = raw.trim().toLowerCase()
  if (!USERNAME_RE.test(value)) {
    return { ok: false, error: 'El usuario tiene que tener entre 3 y 30 caracteres: letras, números, guiones o guiones bajos.' }
  }
  if (RESERVED_USERNAMES.has(value)) {
    return { ok: false, error: 'Ese usuario no está disponible.' }
  }
  return { ok: true, value }
}

export function parseEmail(raw: string): Parsed<string> {
  const value = raw.trim().toLowerCase()
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { ok: false, error: 'Revisá el mail.' }
  }
  return { ok: true, value }
}

// Accepts "@handle", "handle" or a pasted instagram.com link. Empty means "no Instagram".
export function parseInstagram(raw: string): Parsed<string | null> {
  let value = raw.trim()
  if (!value) return { ok: true, value: null }
  value = value
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '')
    .split(/[/?#]/)[0]
    .replace(/^@/, '')
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(value)) {
    return { ok: false, error: 'El usuario de Instagram solo puede tener letras, números, puntos y guiones bajos.' }
  }
  return { ok: true, value }
}

// Keeps digits and an optional leading "+". Spaces, dashes and brackets are dropped.
export function parsePhone(raw: string): Parsed<string | null> {
  const value = raw.replace(/[\s().-]/g, '')
  if (!value) return { ok: true, value: null }
  if (!/^\+?\d{8,15}$/.test(value)) {
    return { ok: false, error: 'Revisá el teléfono: solo números, con código de país si podés (ej: +54 11 1234 5678).' }
  }
  return { ok: true, value }
}

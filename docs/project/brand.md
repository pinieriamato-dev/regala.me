# regala.me — Brand & Voice

## Voice
- **Argentine Spanish, voseo:** "pegás", "compartí", "elegí", "¿querés?". Never "tú"/"usted".
- Friendly, direct, a bit funny about gift drama ("nadie llega con la misma cosa", "sin dramas").
- Short sentences. Talk to one person.
- Honest: no invented numbers, no fake testimonials, no "gratis para siempre".

## Words
| Use | Avoid |
|---|---|
| lista, regalo, reclamar / "me encargo", compartir el link | wishlist, registry, "claim" in UI copy |
| "No hace falta crear cuenta" (for gifters) | anything that suggests gifters must sign up |
| "Hoy es gratis" (if asked) | "gratis para siempre", "100% gratis" as a headline |
| Mercado Libre, Amazon, Tiendanube (as examples) | WhatsApp or Google Sheets as the **primary CTA** (removed per feedback) |

WhatsApp is fine as a share *button*. It's just not the headline.

## Visual system (web)
Brutalist / neubrutalist, inspired by ugly.cash. Full spec in `CLAUDE.md` §8. Rules:
- Palette:
  - cream `#F2F0E6` (bg)
  - ink `#0F0F0F`
  - paper `#FBF8EE`
  - yellow `#F5E13E` (highlights)
  - red `#E63322` (accent)
  - green `#2EC25E` (claimed / success)
- Type: **Archivo Black** for display (ALL CAPS, tight), Inter for body, JetBrains Mono for labels.
- Hard offset shadows (`3px 3px 0 0 #0F0F0F`). **No blur, no gradients, no radius > 4px.**
- Key words get the yellow highlight: `<span className="rg-em">LISTA.</span>`
- Priority stickers: ESENCIAL (red) · ME GUSTA (yellow) · OPCIONAL (paper).

## Audience
- **Creators:** 20–40, Argentina, organizing their own birthday, a baby shower, a wedding, or a Secret Santa.
- **Gifters:** anyone with the link, often on a phone, often older relatives. Zero friction and readable text matter.

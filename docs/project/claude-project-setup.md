# Cómo armar el Claude Project de regala.me

## 1. Crear el proyecto
claude.ai → **Projects** → **Create project** → nombre: `regala.me`.

## 2. Instrucciones del proyecto (copiar y pegar en "Project instructions")

```
Sos el co-founder técnico y de growth de regala.me, una app de listas de regalos para LATAM (Argentina primero).
La gente arma su lista pegando links de Mercado Libre/Amazon/Tiendanube, comparte un link, y sus amigos reclaman
regalos SIN crear cuenta. Web en vivo: https://www.regala.me. Repo: github.com/pinieriamato-dev/regala.me.

Cómo trabajamos:
- El backlog es ROADMAP.md (en el repo y en el conocimiento del proyecto). Cada conversación ataca un ítem
  o un tema. Al terminar, decime qué cambia en el ROADMAP.
- Los cambios de código se hacen en Claude Code sobre el repo (un PR por tema). Pasame siempre el link del PR.
- Antes de proponer features, preguntate si mejora el loop viral (el que regala → crea su propia lista) o la
  confianza (que nadie compre lo mismo, que la sorpresa se mantenga).
- Foco actual: web mobile-first. La app nativa está en pausa.

Reglas:
- Copy de producto en español rioplatense con voseo (ver brand.md). Nunca "gratis para siempre".
- Cero fricción para quien regala: nunca pedirle cuenta.
- Diseño brutalista (ver brand.md / CLAUDE.md §8): bordes duros, Archivo Black, resaltado amarillo, sin blur.
- Honestidad: nada de testimonios ni números inventados.
- Si una decisión cuesta plata, decí el costo en USD antes.
- Recomendá una opción en vez de listar todas.
```

## 3. Archivos para subir a "Project knowledge"
Desde el repo (Code → Download ZIP, o abrir cada archivo y copiar):
1. `CLAUDE.md`: arquitectura, convenciones, gotchas.
2. `ROADMAP.md`: backlog priorizado. **Volvé a subirlo cuando cambie.**
3. `docs/project/strategy.md`: posicionamiento, monetización, calendario de marketing.
4. `docs/project/brand.md`: voz y sistema visual.
5. `docs/project/competitors.md`: competencia.

Opcional: conectá **GitHub** en el proyecto (Add content → GitHub → `pinieriamato-dev/regala.me`) para que
lea el repo directo y no tengas que re-subir archivos.

## 4. Conversaciones sugeridas (una por tema)
| Chat | Para qué | Dónde se ejecuta |
|---|---|---|
| 🔧 Bugs de confianza (N1–N7) | Sorpresa real, deshacer reclamo, link_only, rate limit | Claude Code |
| ✉️ Emails y auth (G2) | Resend + templates en español | Vos en el dashboard + templates de Claude |
| 🎅 Amigo invisible (X1) | Spec → build → lanzamiento antes del 15/11 | Spec acá, build en Claude Code |
| 📈 Analytics (X2) | Plan de eventos + PostHog | Claude Code |
| 📣 Campaña Navidad | Calendario, guiones de TikTok/Reels, outreach | Acá |
| 🔎 SEO | Páginas por ocasión/país, comparativas | Acá + Claude Code |
| 💰 Monetización | Afiliados ML, premium por evento | Acá |

## 5. Accesos que destraban trabajo
- **Supabase connector con permiso SQL**: auditoría de RLS, métricas reales, migraciones (merge transaccional, usernames).
- **Vercel Web Analytics** activado.
- **Resend** con el dominio regala.me verificado.

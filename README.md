# regala.me

Monorepo del MVP de regala.me construido con Turborepo.

## Requisitos
- Node.js 20
- pnpm 8
- Supabase project

## Variables de entorno
Ver `.env.example` para los valores necesarios.

## Comandos
- `pnpm dev:web` arranca la app web de Next.js.
- `pnpm dev:mobile` inicia la app Expo.
- `pnpm build:extension` genera la extensión de Chrome.
- `pnpm lint` ejecuta eslint en los paquetes.
- `pnpm typecheck` corre TypeScript en todos los paquetes.

## Desarrollo
1. Copia `.env.example` a `.env` y completa valores.
2. `pnpm install` para instalar dependencias.
3. `pnpm dev:web` para iniciar la web.
4. `pnpm dev:mobile` para la app móvil.
5. `pnpm build:extension` para obtener los archivos de la extensión.

### Usuarios de prueba
Puedes crear una cuenta nueva usando Supabase Auth.

### Giftcards
Para simular la creación de una orden de giftcard usa la ruta `/api/giftcards/orders`.

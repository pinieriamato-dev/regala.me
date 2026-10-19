// Copy for the per-occasion SEO pages at /regalos-para/[occasion].
// Argentine Spanish (voseo), per docs/project/brand.md. Only describes what the app does today.
export const OCCASION_PAGES = {
  birthday: {
    title: 'Lista de regalos para cumpleaños',
    intro: 'Compartí tu lista por WhatsApp y que cada invitado elija algo. Nadie llega con la misma cosa.',
    tips: [
      'Marcá cada regalo como esencial, me gusta u opcional, así el que no sabe qué elegir va por lo importante.',
      'Pegá el link en el grupo de la familia. Quien lo abre no necesita crear cuenta para reclamar un regalo.',
      'Si alguien se equivoca, la persona que reclamó puede deshacerlo desde el mismo link.',
    ],
  },
  baby_shower: {
    title: 'Lista de regalos para baby shower',
    intro: 'Cuna, ropa, pañales. Que los invitados vean qué falta y se lo lleven sin repetir.',
    tips: [
      'Agregá los productos con su link o precio para que las invitadas comparen sin tener que buscar.',
      'Ordená la lista por prioridad, así lo más importante aparece primero.',
      'Compartila antes del evento. El link se puede abrir desde el celular, sin instalar nada.',
    ],
  },
  wedding: {
    title: 'Lista de regalos para casamiento',
    intro: 'Que los invitados elijan algo para la casa nueva sin que dos personas compren lo mismo.',
    tips: [
      'Armá la lista con cosas para la casa de a poco. Podés agregar, editar o sacar ítems cuando quieras.',
      'Compartí el link en la invitación o en el grupo de la familia.',
      'Mirá quién reclamó qué desde tu panel, o activá el modo sorpresa si no querés ver los nombres.',
    ],
  },
  quinceanera: {
    title: 'Lista de regalos para quince años',
    intro: 'Tu fiesta, tus cosas. Armá la lista y que tu familia y amigos elijan sin dudar.',
    tips: [
      'Sumá ideas de distintos precios para que cada invitado encuentre algo que le quede bien.',
      'Compartí el link por WhatsApp. Quien lo abre ve la lista al instante.',
      'Si preferís que nadie vea qué eligió el otro, activá el modo sorpresa.',
    ],
  },
  graduation: {
    title: 'Lista de regalos para graduación',
    intro: 'Terminaste una etapa. Que los que te quieren elijan algo para la que sigue.',
    tips: [
      'Poné lo que necesitás para la facultad, el viaje o el primer trabajo.',
      'Marcá lo esencial, así quien quiere ayudar sabe por dónde empezar.',
      'Compartí el link en el grupo de amigos. No hace falta crear cuenta para reclamar.',
    ],
  },
} as const

export type OccasionPageId = keyof typeof OCCASION_PAGES

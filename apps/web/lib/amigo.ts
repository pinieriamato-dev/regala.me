// Title prefix for the list each amigo invisible participant gets automatically (see joinAmigoGroup).
export const AMIGO_LIST_TITLE_PREFIX = 'Amigo invisible · '

export function isAmigoListTitle(title: string | null | undefined): boolean {
  return !!title?.startsWith(AMIGO_LIST_TITLE_PREFIX)
}

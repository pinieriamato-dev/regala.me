export type OccasionId =
  | 'birthday'
  | 'baby_shower'
  | 'wedding'
  | 'quinceañera'
  | 'graduation'
  | 'other'

export type Currency = 'ARS' | 'BRL' | 'MXN' | 'CLP' | 'COP' | 'UYU' | 'PEN' | 'USD'

export type Priority = 1 | 2 | 3

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Wishlist {
  id: string
  owner_id: string
  title: string
  slug: string
  occasion: OccasionId | null
  occasion_date: string | null
  recipient_name: string | null
  is_surprise: boolean
  currency: Currency
  is_public: boolean
  created_at: string
}

export interface Item {
  id: string
  wishlist_id: string
  title: string
  description: string | null
  price: number | null
  image_url: string | null
  url: string | null
  priority: Priority
  sort_order: number
  created_at: string
}

export interface Claim {
  id: string
  item_id: string
  claimer_name: string
  claimer_phone: string | null
  is_group_gift: boolean
  contribution_amount: number | null
  created_at: string
}

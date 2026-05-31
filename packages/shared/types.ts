export type Wishlist = {
  id: string;
  owner: string;
  title: string;
  slug: string;
  visibility: 'public' | 'private';
  allow_reservations: boolean;
  notify_on_purchase: boolean;
};

export type Item = {
  id: string;
  wishlist_id: string;
  title: string;
  url: string | null;
  note: string | null;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  sort_order: number;
};

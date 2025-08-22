export async function parseOG(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const get = (prop: string) => {
    const match = html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`));
    return match ? match[1] : undefined;
  };
  return {
    title: get('og:title'),
    image: get('og:image'),
    price: get('product:price:amount'),
    currency: get('product:price:currency')
  };
}

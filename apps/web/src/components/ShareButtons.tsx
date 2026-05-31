export default function ShareButtons({ url }: { url: string }) {
  const encoded = encodeURIComponent(url);
  return (
    <div className="flex space-x-2">
      <a href={`https://wa.me/?text=${encoded}`} target="_blank">WhatsApp</a>
      <a href={`https://t.me/share/url?url=${encoded}`} target="_blank">Telegram</a>
    </div>
  );
}

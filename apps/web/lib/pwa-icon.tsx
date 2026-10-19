import { ImageResponse } from 'next/og'

// Brutalist app icon (cream tile, yellow block, hard shadow), drawn with Satori
// so the PWA icons are generated and no binary asset lives in the repo.
export function pwaIcon(size: number) {
  const unit = size / 32

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#F2F0E6',
        }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: size * 0.7, height: size * 0.7,
            background: '#F5E13E',
            border: `${unit}px solid #0F0F0F`,
            boxShadow: `${unit * 2}px ${unit * 2}px 0 0 #0F0F0F`,
            fontFamily: 'Impact, sans-serif',
            fontSize: size * 0.4,
            color: '#0F0F0F',
          }}
        >
          R
        </div>
      </div>
    ),
    { width: size, height: size }
  )
}

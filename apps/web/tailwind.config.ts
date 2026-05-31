import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:     '#F2F0E6',
        ink:    '#0F0F0F',
        paper:  '#FBF8EE',
        yellow: '#F5E13E',
        red:    '#E63322',
        green:  '#2EC25E',
        // keep for gifter view compat
        primary: '#E63322',
        'primary-light': '#FDEAE8',
      },
      fontFamily: {
        display: ['var(--font-archivo-black)', 'Impact', 'sans-serif'],
        body:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        hard:    '5px 5px 0 0 #0F0F0F',
        'hard-sm': '3px 3px 0 0 #0F0F0F',
      },
      borderRadius: {
        brut: '4px',
      },
    },
  },
  plugins: [],
}

export default config

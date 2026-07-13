/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        police: {
          darkest: '#080c14',
          dark: '#0e1726',
          card: 'rgba(14, 23, 38, 0.7)',
          accent: '#00f0ff', // Electric Cyan
          gold: '#f59e0b',   // Amber Gold
          critical: '#e11d48', // Deep Crimson
          success: '#10b981',  // Emerald Green
          text: '#f8fafc',
          muted: '#94a3b8'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      boxShadow: {
        'cyan-glow': '0 0 15px rgba(0, 240, 255, 0.25)',
        'amber-glow': '0 0 15px rgba(245, 158, 11, 0.25)',
        'crimson-glow': '0 0 15px rgba(225, 29, 72, 0.25)',
        'success-glow': '0 0 15px rgba(16, 185, 129, 0.25)',
        'neon': '0 0 15px rgba(0, 240, 255, 0.25)'
      }
    },
  },
  plugins: [],
}

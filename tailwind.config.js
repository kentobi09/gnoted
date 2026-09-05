/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        vault: {
          bg: '#080A10',
          card: '#121722',
          cardBorder: '#1E293B',
          cyan: '#06B6D4',
          cyanLight: '#38BDF8',
          cyanDark: '#0284C7',
          textMuted: '#94A3B8',
          textSubtle: '#64748B',
        }
      },
      borderRadius: {
        'card': '20px',
        'pill': '50px',
      }
    },
  },
  plugins: [],
}

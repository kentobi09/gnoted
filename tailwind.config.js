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
          bg: '#08080A',
          card: '#111216',
          cardBorder: '#22242D',
          amber: '#F59E0B',
          amberLight: '#FBBF24',
          amberDark: '#D97706',
          textMuted: '#A1A1AA',
          textSubtle: '#71717A',
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

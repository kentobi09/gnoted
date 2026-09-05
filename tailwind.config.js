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
          bg: '#000000',
          card: '#1C1C1E',
          cardBorder: '#2C2C2E',
          orange: '#FF6B00',
          orangeDark: '#E66000',
          textMuted: '#8E8E93',
          textSubtle: '#636366',
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

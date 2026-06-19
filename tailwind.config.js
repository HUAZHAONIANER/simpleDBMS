/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/client/**/*.{html,ts,tsx}",
    "./src/client/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0891b2',
        secondary: '#10b981',
        dark: '#0f172a',
        'dark-secondary': '#1e293b',
        'dark-accent': '#334155'
      }
    }
  },
  plugins: []
}

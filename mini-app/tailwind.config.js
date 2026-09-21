/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: 'var(--tg-theme-bg-color, #ffffff)',
          text: 'var(--tg-theme-text-color, #111827)',
          hint: 'var(--tg-theme-hint-color, #6b7280)',
          link: 'var(--tg-theme-link-color, #2563eb)',
          button: 'var(--tg-theme-button-color, #0284c7)',
          buttonText: 'var(--tg-theme-button-text-color, #ffffff)',
          secondaryBg: 'var(--tg-theme-secondary-bg-color, #f3f4f6)',
        }
      }
    },
  },
  plugins: [],
}

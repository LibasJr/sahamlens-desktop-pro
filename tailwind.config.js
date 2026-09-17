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
        'pro-bg': '#0A0A0B',
        'pro-surface': '#151518',
        'pro-card': '#1A1A1E',
        'pro-border': '#232326',
      },
    },
  },
  plugins: [],
};

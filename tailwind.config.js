// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",   // scan all app/ files
    "./pages/**/*.{js,ts,jsx,tsx}", // scan pages/ if used
    "./components/**/*.{js,ts,jsx,tsx}" // scan components/
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Season 2 palette — mirrors the CSS custom properties in globals.css
      colors: {
        ink: {
          950: "var(--ink-950)",
          900: "var(--ink-900)",
          800: "var(--ink-800)",
          700: "var(--ink-700)",
        },
        chalk: {
          DEFAULT: "var(--chalk)",
          dim: "var(--chalk-dim)",
        },
        tape: {
          DEFAULT: "var(--tape)",
          deep: "var(--tape-deep)",
        },
        run: "var(--run)",
        walk: "var(--walk)",
        cycle: "var(--cycle)",
        gold: "var(--gold)",
        silver: "var(--silver)",
        bronze: "var(--bronze)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "var(--radius)",
      },
      keyframes: {
        "bib-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "bib-in": "bib-in 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};

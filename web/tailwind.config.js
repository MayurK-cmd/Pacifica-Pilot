/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic tokens backed by CSS vars (see index.css) so the same
        // classes adapt to light/dark via the `dark` class on <html>.
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        wash: "rgb(var(--wash) / <alpha-value>)",
        teal: { DEFAULT: "#0d9488" },
        up: "rgb(var(--up) / <alpha-value>)",
        down: "rgb(var(--down) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
      },
      fontSize: {
        metric: ["1.375rem", { lineHeight: "1.75rem", fontWeight: "650" }],
      },
    },
  },
  plugins: [],
};

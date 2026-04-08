/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /* ── Surfaces: Smoked Obsidian tonal layers ── */
        background: "#181022",
        surface: "#181022",
        "surface-dim": "#181022",
        "surface-bright": "#3e354a",
        "surface-container-lowest": "#120a1d",
        "surface-container-low": "#20182b",
        "surface-container": "#241c2f",
        "surface-container-high": "#2f263a",
        "surface-container-highest": "#3a3146",
        "surface-variant": "#3a3146",
        "surface-tint": "#cebdff",

        /* ── Primary: Ametrine purple ── */
        primary: "#cebdff",
        "primary-container": "#9b7fed",
        "on-primary": "#381385",
        "on-primary-container": "#31057e",
        "primary-fixed": "#e8ddff",
        "primary-fixed-dim": "#cebdff",
        "on-primary-fixed": "#21005e",
        "on-primary-fixed-variant": "#4f319c",

        /* ── On-surface ── */
        "on-surface": "#ebddf8",
        "on-surface-variant": "#cbc3d7",
        "on-background": "#ebddf8",

        /* ── Secondary: Indigo ── */
        secondary: "#c3c0ff",
        "secondary-container": "#3e3c8f",
        "secondary-fixed": "#e2dfff",
        "secondary-fixed-dim": "#c3c0ff",
        "on-secondary": "#272377",
        "on-secondary-container": "#afadff",
        "on-secondary-fixed": "#100563",
        "on-secondary-fixed-variant": "#3e3c8f",

        /* ── Tertiary: Mint (Buy / Success) ── */
        tertiary: "#4edea3",
        "tertiary-container": "#00a572",
        "tertiary-fixed": "#6ffbbe",
        "tertiary-fixed-dim": "#4edea3",
        "on-tertiary": "#003824",
        "on-tertiary-container": "#00311f",
        "on-tertiary-fixed": "#002113",
        "on-tertiary-fixed-variant": "#005236",

        /* ── Error: Warm red (Sell / Alert) ── */
        error: "#ffb4ab",
        "error-container": "#93000a",
        "on-error": "#690005",
        "on-error-container": "#ffdad6",

        /* ── Utility ── */
        outline: "#958ea0",
        "outline-variant": "#494454",
        "inverse-surface": "#ebddf8",
        "inverse-on-surface": "#352d41",
        "inverse-primary": "#674bb5",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        sm: "0.125rem",
        md: "0.375rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem",
      },
    },
  },
  plugins: [],
};

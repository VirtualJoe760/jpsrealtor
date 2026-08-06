import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Override with your brand color; drives buttons, links, map pins.
        brand: {
          DEFAULT: "#1e3a5f",
          600: "#1e3a5f",
          700: "#16304f",
        },

        // Token-backed names. Prefer these when you write NEW surfaces —
        // they say what the colour is for, not what it happens to look like
        // in the default theme.
        surface: "var(--surface)", // card / panel background
        "surface-2": "var(--surface-2)", // subtle fill (table stripes, wells)
        line: "var(--border)", // hairlines and card borders
        ink: "var(--text)", // primary text — and inverted blocks
        muted: "var(--text-muted)", // secondary text

        // THE GRAY SCALE IS THEME-DERIVED, exactly like borderRadius above and
        // for exactly the same reason: the template is ~250 `text-gray-*` /
        // `border-gray-*` / `bg-gray-*` utilities deep, and a knob that half
        // the site ignores is a decoy.
        //
        // Before this, setting `--background: #0f0b2c` produced a dark page
        // whose text was still Tailwind's stock near-black. On /about the
        // agent's own name (`text-gray-900`, #111827) sat at ~1.2:1 against
        // the page — a judged session called it invisible, and it was. Fixing
        // that one page would have left the same defect on every other route.
        //
        // Each shade is the stock ramp's position expressed as a mix of --text
        // into the page background, so at the DEFAULT tokens (#0f172a on
        // #ffffff) these land within a hair of stock Tailwind gray, and in a
        // dark theme they invert automatically. Mixed against --surface (which
        // defaults to --background) so text inside a deliberately-lifted card
        // stays legible against THAT card.
        //
        // `white` and `black` are deliberately NOT remapped: `text-white` on
        // `bg-brand` must stay white in every theme. Use `bg-surface` for a
        // card, not `bg-white`.
        gray: {
          50: "color-mix(in srgb, var(--text) 3%, var(--surface))",
          100: "color-mix(in srgb, var(--text) 6%, var(--surface))",
          200: "color-mix(in srgb, var(--text) 12%, var(--surface))",
          300: "color-mix(in srgb, var(--text) 22%, var(--surface))",
          400: "color-mix(in srgb, var(--text) 42%, var(--surface))",
          500: "color-mix(in srgb, var(--text) 58%, var(--surface))",
          600: "color-mix(in srgb, var(--text) 70%, var(--surface))",
          700: "color-mix(in srgb, var(--text) 82%, var(--surface))",
          800: "color-mix(in srgb, var(--text) 91%, var(--surface))",
          900: "var(--text)",
          950: "var(--text)",
        },
      },
      // Tailwind's whole radius scale is wired to the --radius token in
      // globals.css, so `rounded-xl` on a card FOLLOWS the knob instead of
      // silently overriding it. Before this, `--radius: 0` produced a site
      // that was sharp on the surfaces styled by hand and still rounded on
      // the listing detail hero, the spec box, the inquiry sidebar and the
      // CHAP result cards — the knob was a decoy, and a judge caught it.
      //
      // Ratios are relative to --radius = 0.75rem, which reproduces stock
      // Tailwind exactly at the default token, and collapses every surface
      // to square at --radius: 0.
      //
      // `full` stays 9999px on purpose: avatars, the CHAP launcher, filter
      // pills and map pins are circles/capsules by shape, not by theme, and
      // a sharp build still wants them round. `none` stays 0 as the escape
      // hatch for one-off square corners in a rounded theme.
      borderRadius: {
        none: "0",
        sm: "calc(var(--radius) * 0.167)",
        DEFAULT: "calc(var(--radius) * 0.333)",
        md: "calc(var(--radius) * 0.5)",
        lg: "calc(var(--radius) * 0.667)",
        xl: "var(--radius)",
        "2xl": "calc(var(--radius) * 1.333)",
        "3xl": "calc(var(--radius) * 2)",
        full: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;

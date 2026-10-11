import type { Config } from "tailwindcss";

// Mismos valores que apps/web/app/globals.css y packages/shared/src/design/tokens.ts.
// v0.1 no tiene el codegen de la sección 5b.2 del spec (`design:build`): si
// cambiás un color, tocá los tres lugares. Es la próxima mejora obvia.
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/shared/src/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#4cc13b",
          600: "#3ea22f",
        },
        app: "#f7f7f8",
        surface: "#ffffff",
        text: "#111114",
      },
      borderRadius: {
        md: "0.5rem",
      },
    },
  },
} satisfies Config;

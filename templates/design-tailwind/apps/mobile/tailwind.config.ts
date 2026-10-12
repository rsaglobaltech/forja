import type { Config } from "tailwindcss";

// Same values as apps/web/app/globals.css and packages/shared/src/design/tokens.ts.
// v0.1 does not have the codegen from section 5b.2 of the spec (`design:build`):
// if you change a color, change it in all three places. That is the obvious next improvement.
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

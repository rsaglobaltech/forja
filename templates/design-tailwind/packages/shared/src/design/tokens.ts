/**
 * Fuente de verdad de la paleta. En v0.1 (solo web) esto se consume
 * directamente en `apps/web/app/globals.css` a mano; cuando se agregue
 * `mobile`, acá es donde va el codegen hacia `tailwind.generated.js`
 * (sección 5b.2 del spec de forja) para no duplicar hexes entre plataformas.
 */
export const palette = {
  brand: {
    500: "#4cc13b",
    600: "#3ea22f",
  },
  neutral: {
    app: "#f7f7f8",
    surface: "#ffffff",
    text: "#111114",
  },
} as const;

export const spacing = {
  xs: "0.5rem",
  sm: "0.75rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
} as const;

export const radius = {
  md: "0.5rem",
} as const;

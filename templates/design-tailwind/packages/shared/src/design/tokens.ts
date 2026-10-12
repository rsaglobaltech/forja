/**
 * Source of truth for the palette. In v0.1 (web only) it is copied by hand
 * into `apps/web/app/globals.css`; once `mobile` is added, this is where the
 * codegen to `tailwind.generated.js` goes (section 5b.2 of the forja spec),
 * so hex values are not duplicated across platforms.
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

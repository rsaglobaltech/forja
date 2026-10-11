import { palette } from "./tokens.js";

export const semantic = {
  light: {
    app: palette.neutral.app,
    surface: palette.neutral.surface,
    text: palette.neutral.text,
    brand: palette.brand[500],
  },
} as const;

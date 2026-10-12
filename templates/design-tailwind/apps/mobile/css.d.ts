// app/_layout.tsx imports ../global.css for NativeWind. TypeScript 6 checks
// side-effect imports, and a stylesheet has no types of its own. This file has
// no imports on purpose: only then is the declaration global.
declare module "*.css";

// NativeWind 4.2 publica su archivo de tipos con "exports": {} en su
// package.json, lo que rompe `/// <reference types="nativewind/types" />`
// bajo resolución moderna de TypeScript (no puede resolver el subpath).
// Declaramos `className` nosotros mismos en los componentes que usamos —
// el soporte en runtime (babel + metro) no depende de estos tipos, así que
// esto es puramente para que `tsc` no se queje.
import type {} from "react-native";

declare module "react-native" {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
}

// NativeWind 4.2 ships its types file with "exports": {} in its
// package.json, which breaks `/// <reference types="nativewind/types" />`
// under modern TypeScript resolution (it cannot resolve the subpath).
// We declare `className` ourselves on the components we use — runtime
// support (babel + metro) does not depend on these types, so this exists
// purely to keep `tsc` quiet.
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

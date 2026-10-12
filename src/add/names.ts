import { ForjaError } from "../project/project.js";

const words = (raw: string) =>
  raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);

/** "place-order", "place_order", "placeOrder" → "PlaceOrder". */
export const pascal = (raw: string) =>
  words(raw)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");

/** "PlaceOrder" → "placeOrder". */
export const camel = (raw: string) => {
  const p = pascal(raw);
  return p[0].toLowerCase() + p.slice(1);
};

/** "PlaceOrder" → "place order": how a requirement title reads. */
export const sentence = (raw: string) => {
  const s = words(raw).join(" ").toLowerCase();
  return s[0].toUpperCase() + s.slice(1);
};

/**
 * A module (Java package segment, Node folder under application/): lower case,
 * letters and digits only — "Orders", "order-items" → "orders", "orderitems".
 */
export const moduleName = (raw: string) => words(raw).join("").toLowerCase();

export interface Target {
  /** The module or context, when one was given: "orders". */
  module?: string;
  /** The class name, without a suffix: "PlaceOrder". */
  name: string;
}

/**
 * "orders/PlaceOrder" or "PlaceOrder". A suffix the generator adds itself
 * ("UseCase") is dropped, so `PlaceOrderUseCase` does not become
 * `PlaceOrderUseCaseUseCase`.
 */
export function parseTarget(raw: string, dropSuffix?: string): Target {
  const parts = raw.split("/").filter(Boolean);
  if (parts.length === 0 || parts.length > 2) {
    throw new ForjaError(`"${raw}" is not a name.`, 'Use "<module>/<Name>", e.g. "orders/PlaceOrder".');
  }
  let name = pascal(parts[parts.length - 1]);
  if (dropSuffix && name.endsWith(dropSuffix) && name !== dropSuffix) {
    name = name.slice(0, -dropSuffix.length);
  }
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) {
    throw new ForjaError(`"${raw}" does not give a valid class name.`, "Start it with a letter: e.g. PlaceOrder.");
  }
  const module = parts.length === 2 ? moduleName(parts[0]) : undefined;
  if (module !== undefined && !/^[a-z][a-z0-9]*$/.test(module)) {
    throw new ForjaError(`"${parts[0]}" is not a valid module name.`, "Use letters and digits, starting with a letter.");
  }
  return { module, name };
}

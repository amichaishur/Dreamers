export function parseHex(hex: string): [number, number, number] {
  let h = (hex || "#888888").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function mix(a: string, b: string, t: number): string {
  const x = parseHex(a), y = parseHex(b);
  const c = (i: number) => Math.round(x[i] + (y[i] - x[i]) * t);
  const h = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${h(c(0))}${h(c(1))}${h(c(2))}`;
}

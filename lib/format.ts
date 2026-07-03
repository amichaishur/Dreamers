/** Two-letter initials from a display name, falling back to an email/string. */
export function initialsFrom(name: string | null | undefined, fallback = ""): string {
  const src = (name || "").trim();
  if (src) {
    const parts = src.split(/\s+/).filter(Boolean);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : src.slice(0, 2).toUpperCase();
  }
  return fallback.slice(0, 2).toUpperCase();
}

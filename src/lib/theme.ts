export type Theme = "dark" | "light";
const KEY = "cliper-theme";
export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem(KEY) as Theme) || "dark";
}
export function applyTheme(t: Theme) {
  localStorage.setItem(KEY, t);
  document.documentElement.classList.toggle("dark", t === "dark");
}

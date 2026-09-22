export const DEMO_AUTH_STORAGE_KEY = "shushu-food-demo-auth-v1";

/** Pages that only read the food catalog or calculate a recommendation. */
export function isPublicPagePath(pathname: string) {
  return pathname === "/"
    || pathname === "/login"
    || pathname === "/discover"
    || pathname.startsWith("/place/")
    || pathname.startsWith("/food/")
    || pathname.startsWith("/share/");
}

export function loginHref(nextPath: string) {
  return `/login?next=${encodeURIComponent(nextPath || "/")}`;
}

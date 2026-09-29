import type { CookieOptionsWithName } from "@supabase/ssr";

// The preview runs inside another site. Lax cookies are dropped there, so a
// successful sign-up looks like a click that did nothing. Partitioned cookies
// are kept on https. Plain http (local npm run dev) stays on Lax.
export function supabaseCookieOptions(secure: boolean): CookieOptionsWithName {
  if (!secure) {
    return { path: "/", sameSite: "lax", secure: false };
  }

  return {
    path: "/",
    sameSite: "none",
    secure: true,
    partitioned: true,
  };
}

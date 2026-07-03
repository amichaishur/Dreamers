import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC = ["/welcome", "/auth", "/d"];
const GATE_COOKIE = "dreamers_gate";
const GATE_TTL = 60; // seconds

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + "/") || path.startsWith(p + "?")) || path === "/welcome";

  // Not signed in → only public pages allowed
  if (!user) {
    if (!isPublic) return NextResponse.redirect(new URL("/welcome", req.url));
    return res;
  }

  // Signed in → gate by profile status/role.
  // Cache the gate in a short-lived cookie so rapid navigation skips the DB round-trip.
  let status: string | undefined;
  let role: string | undefined;
  const cached = req.cookies.get(GATE_COOKIE)?.value;
  if (cached) {
    const [cid, cstatus, crole] = cached.split(":");
    if (cid === user.id) { status = cstatus; role = crole; }
  }
  if (status === undefined) {
    const { data: prof } = await supabase.from("profiles").select("status, role").eq("id", user.id).single();
    status = prof?.status;
    role = prof?.role;
    // Only cache the fast path for active users. Pending users are checked fresh
    // so redeeming a code / being approved takes effect immediately.
    if (status === "active") {
      res.cookies.set(GATE_COOKIE, `${user.id}:${status}:${role ?? ""}`, { maxAge: GATE_TTL, httpOnly: true, sameSite: "lax", path: "/" });
    }
  }
  const active = status === "active";

  if (path === "/welcome") {
    if (active) return NextResponse.redirect(new URL("/home", req.url));
    if (req.nextUrl.searchParams.get("mode") !== "pending") {
      return NextResponse.redirect(new URL("/welcome?mode=pending", req.url));
    }
    return res; // show the pending screen
  }
  if (!active) {
    return NextResponse.redirect(new URL("/welcome?mode=pending", req.url));
  }
  if (path === "/admin" && role !== "admin") {
    return NextResponse.redirect(new URL("/home", req.url));
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

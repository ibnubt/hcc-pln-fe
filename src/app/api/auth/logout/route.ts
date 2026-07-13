import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  cookies().set(AUTH_COOKIE, "", { path: "/", maxAge: 0, sameSite: "lax" });
  return Response.json({ ok: true });
}

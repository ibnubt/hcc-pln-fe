import { cookies } from "next/headers";
import { AUTH_COOKIE, AUTH_MAX_AGE, checkCredentials } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let username = "";
  let password = "";
  try {
    const body = await req.json();
    username = String(body?.username ?? "");
    password = String(body?.password ?? "");
  } catch {
    /* ignore */
  }

  if (!checkCredentials(username, password)) {
    return Response.json({ ok: false, detail: "Username atau password salah." }, { status: 401 });
  }

  cookies().set(AUTH_COOKIE, "1", {
    httpOnly: true,
    path: "/",
    maxAge: AUTH_MAX_AGE,
    sameSite: "lax",
  });
  return Response.json({ ok: true });
}

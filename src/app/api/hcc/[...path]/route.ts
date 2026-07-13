import type { NextRequest } from "next/server";
import { handleProxy } from "@/lib/hcc/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: { path: string[] } };

async function proxy(req: NextRequest, { params }: Ctx) {
  return handleProxy(req, params.path ?? []);
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

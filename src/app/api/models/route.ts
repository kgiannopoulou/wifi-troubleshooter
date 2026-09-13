import { NextResponse } from "next/server";
import { getRouterModels } from "@/lib/catalog";

// Public: powers the homepage's "pick your router model" step. Only used
// by the browser — the homepage Server Component itself calls
// getRouterModels() directly instead of fetching this.
export async function GET() {
  const models = await getRouterModels();
  return NextResponse.json({ models });
}

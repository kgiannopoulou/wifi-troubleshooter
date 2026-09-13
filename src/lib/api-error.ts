import { NextResponse } from "next/server";
import { ZodError } from "zod";

// Route handlers throw this for expected failures (404, 403, etc.) and let
// the catch block in each route hand it to apiError() below, instead of
// manually building a NextResponse at every throw site.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

// Next.js Route Handlers have no Express-style centralized error
// middleware, so every route's catch block calls this directly:
//   try { ... } catch (err) { return apiError(err); }
export function apiError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request", details: err.flatten() }, { status: 400 });
  }
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

import { NextRequest, NextResponse } from "next/server";
import { getNodeWithOptions } from "@/lib/nodes";
import { apiError, HttpError } from "@/lib/api-error";

// Public: one step of the diagnostic wizard. The frontend calls this with
// the id it got either from a symptom's rootNodeId or from a previous
// step's option.nextNodeId.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    const result = await getNodeWithOptions(id);
    if (!result) {
      throw new HttpError(404, "Question not found");
    }
    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}

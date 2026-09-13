import { NextRequest, NextResponse } from "next/server";
import { getModelBySlug, getSymptomsForModel } from "@/lib/catalog";
import { apiError, HttpError } from "@/lib/api-error";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const model = await getModelBySlug(slug);
    if (!model) throw new HttpError(404, "Router model not found");

    const symptoms = await getSymptomsForModel(model.id);
    return NextResponse.json({ symptoms });
  } catch (err) {
    return apiError(err);
  }
}

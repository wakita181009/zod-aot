import { NextResponse } from "next/server";
import { validateProduct, validateUser } from "@/lib/schemas";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "user";
  const body: unknown = await request.json();

  const validator = type === "product" ? validateProduct : validateUser;
  const result = validator.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ success: false, errors: result.error.issues }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: result.data });
}

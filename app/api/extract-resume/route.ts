import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Resume extraction endpoint working",
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  console.log("Resume ID:", body.resumeId);

  return NextResponse.json({
    success: true,
    resumeId: body.resumeId,
  });
}
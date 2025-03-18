// app/api/personalized-response/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generatePersonalizedResponse } from "@/lib/llm";

export async function POST(request: NextRequest) {
  try {
    const { userId, input } = await request.json();
    console.log("userId", userId, "input", input);
    if (!userId || !input) {
      return NextResponse.json(
        { error: "userId and input are required" },
        { status: 400 }
      );
    }

    const response = await generatePersonalizedResponse(userId, input);
    console.log("response", response);
    return NextResponse.json({ response }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate personalized response" },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods with a 405 Method Not Allowed response
export async function GET() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { EMAIL_SYSTEM_PROMPT, CALENDAR_SYSTEM_PROMPT } from "@/lib/prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("auth");
  if (!authCookie || authCookie.value !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, mode } = await request.json();

  if (!messages || messages.length === 0) {
    return NextResponse.json(
      { error: "Berichten zijn verplicht" },
      { status: 400 }
    );
  }

  const systemPrompt =
    mode === "calendar" ? CALENDAR_SYSTEM_PROMPT : EMAIL_SYSTEM_PROMPT;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });

  const rawResult =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Try to parse structured JSON response
  try {
    // Strip markdown code fences if present
    let jsonStr = rawResult.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    return NextResponse.json({
      title: parsed.title || "",
      body: parsed.body || "",
      chat: parsed.chat || "",
    });
  } catch {
    // Fallback: treat entire response as body
    return NextResponse.json({
      title: "",
      body: rawResult,
      chat: "",
    });
  }
}

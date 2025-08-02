// /api/mentor/session/update-status.ts
import { db } from "@/db";
import { bookingSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { sessionId, status } = await req.json();

  if (!["accepted", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await db
    .update(bookingSessions)
    .set({ status, updatedAt: new Date() })
    .where(eq(bookingSessions.id, sessionId));

  return NextResponse.json({ success: true });
}

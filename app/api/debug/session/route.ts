import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { cookies } from "next/headers";

/**
 * Debug endpoint to check session status
 * Helps diagnose authentication issues
 */
export async function GET() {
  try {
    const session = await getSession();
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token");

    return NextResponse.json({
      hasSession: !!session,
      hasToken: !!token,
      sessionData: session ? {
        id: session.id,
        role: session.role,
        email: session.email,
        firstName: session.firstName,
        lastName: session.lastName
      } : null,
      tokenPresent: !!token?.value,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[DEBUG SESSION ERROR]", error);
    return NextResponse.json({
      hasSession: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

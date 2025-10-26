import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session_token")?.value

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    // Verify JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET)

    return NextResponse.json(
      {
        authenticated: true,
        role: payload.role,
        userId: payload.userId,
      },
      { status: 200 }
    )
  } catch (error) {
    // Token invalid or expired
    return NextResponse.json(
      { authenticated: false },
      { status: 200 }
    )
  }
}

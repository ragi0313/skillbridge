import { NextResponse } from "next/server";

/**
 * Simple endpoint to test if webhook is reachable
 * Visit: https://skillbridge-2m1e.vercel.app/api/xendit/webhook/test
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Webhook endpoint is reachable",
    timestamp: new Date().toISOString(),
    webhookUrl: "https://skillbridge-2m1e.vercel.app/api/xendit/webhook",
    note: "If you can see this, the webhook endpoint is accessible. Configure this URL in Xendit Dashboard."
  });
}

export async function POST() {
  return NextResponse.json({
    status: "ok",
    message: "POST to webhook test endpoint successful",
    timestamp: new Date().toISOString()
  });
}

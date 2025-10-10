import { Metadata } from "next"
import { getSession } from "@/lib/auth/getSession"
import SupportCenter from "@/components/support/SupportCenter"

export const metadata: Metadata = {
  title: "Support Center | BridgeMentor",
  description: "Get help and support for your BridgeMentor experience",
}

export default async function SupportPage() {
  const session = await getSession()

  return <SupportCenter user={session} />
}
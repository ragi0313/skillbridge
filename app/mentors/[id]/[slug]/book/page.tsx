import { getSession } from "@/lib/auth/getSession"
import BookMentorSessionPageClient from "./BookMentorSessionPageClient"
import { redirect } from "next/navigation"

export default async function BookMentorSessionPageWrapper() {
  const session = await getSession()

  if (!session) {
    return redirect("/login")
  }

  return <BookMentorSessionPageClient session={session} />
}

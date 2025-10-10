import { Metadata } from 'next'
import { getSession } from '@/lib/auth/getSession'
import FAQContent from './FAQContent'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | BridgeMentor',
  description: 'Find answers to common questions about BridgeMentor mentoring platform, sessions, payments, and more.',
  keywords: ['FAQ', 'questions', 'help', 'support', 'mentoring', 'BridgeMentor'],
}

export default async function FAQPage() {
  const session = await getSession()

  return <FAQContent session={session} />
}
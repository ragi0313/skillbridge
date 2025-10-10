import { Metadata } from 'next'
import { getSession } from '@/lib/auth/getSession'
import TermsContent from './TermsContent'

export const metadata: Metadata = {
  title: 'Terms of Service | BridgeMentor',
  description: 'Terms of Service for BridgeMentor - the professional mentoring platform',
}

export default async function TermsOfServicePage() {
  const session = await getSession()

  return <TermsContent session={session} />
}
import { Metadata } from 'next'
import { getSession } from '@/lib/auth/getSession'
import PrivacyContent from './PrivacyContent'

export const metadata: Metadata = {
  title: 'Privacy Policy | BridgeMentor',
  description: 'Privacy Policy for BridgeMentor - how we protect your personal information',
}

export default async function PrivacyPolicyPage() {
  const session = await getSession()

  return <PrivacyContent session={session} />
}
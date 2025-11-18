import { Metadata } from 'next'
import { getSession } from '@/lib/auth/getSession'
import CancellationPolicyContent from './CancellationPolicyContent'

export const metadata: Metadata = {
  title: 'Cancellation Policy | BridgeMentor',
  description: 'Cancellation Policy for BridgeMentor - the professional mentoring platform',
}

export default async function CancellationPolicyPage() {
  const session = await getSession()

  return <CancellationPolicyContent session={session} />
}

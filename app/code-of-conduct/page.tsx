import { Metadata } from 'next'
import { getSession } from '@/lib/auth/getSession'
import ConductContent from './ConductContent'

export const metadata: Metadata = {
  title: 'Code of Conduct | BridgeMentor',
  description: 'Code of Conduct for BridgeMentor - community standards and guidelines',
}

export default async function CodeOfConductPage() {
  const session = await getSession()

  return <ConductContent session={session} />
}
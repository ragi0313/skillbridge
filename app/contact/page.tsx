import { Metadata } from 'next'
import ContactContent from './ContactContent'

export const metadata: Metadata = {
  title: 'Contact Support | BridgeMentor',
  description: 'Get in touch with BridgeMentor support team. We are here to help you with any questions or issues.',
  keywords: ['contact', 'support', 'help', 'assistance', 'BridgeMentor'],
}

export default function ContactPage() {
  return <ContactContent />
}
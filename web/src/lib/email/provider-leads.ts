import React from 'react'
import { sendTransactionalEmail } from '@/lib/email/client'

type LeadEmailPayload = {
  name?: string | null
  email: string
  company?: string | null
  providerType?: string | null
  location?: string | null
  website?: string | null
  message?: string | null
  phone?: string | null
}

export async function sendProviderLeadEmail(lead: LeadEmailPayload) {
  const subject = 'New provider lead'
  const lines = [
    `Email: ${lead.email}`,
    lead.name ? `Name: ${lead.name}` : null,
    lead.company ? `Company: ${lead.company}` : null,
    lead.providerType ? `Type: ${lead.providerType}` : null,
    lead.location ? `Location: ${lead.location}` : null,
    lead.website ? `Website: ${lead.website}` : null,
    lead.phone ? `Phone: ${lead.phone}` : null,
    lead.message ? `Message: ${lead.message}` : null,
  ].filter(Boolean)

  const text = lines.join('\n')

  await sendTransactionalEmail({
    to: { email: 'daniel@interludepass.com', name: 'Interlude Provider Leads' },
    subject,
    react: React.createElement('pre', null, text),
  })
}

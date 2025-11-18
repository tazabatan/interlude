import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { CtaButton } from '@/emails/components/cta-button'
import type { StatementReadyEmailPayload } from '@/emails/types'

export function StatementReadyEmail(props: StatementReadyEmailPayload) {
  const previewText = `Statement ready for ${props.venueName}`
  return (
    <EmailLayout
      previewText={previewText}
      title="Your weekly statement is ready."
      intro={`View the detailed ledger for ${props.periodLabel}.`}
    >
      <Section className="space-y-4">
        <Text className="text-base leading-6 text-[#1D1F1E]">
          Total due: <strong>{props.totalDueLabel}</strong>
        </Text>
        <CtaButton href={props.statementUrl} label="Review statement" description="Opens the venue dashboard" />
        <Text className="text-sm leading-6 text-[#6F716D]">
          Questions? Reply to this email and we’ll help reconcile any line items before payment.
        </Text>
      </Section>
    </EmailLayout>
  )
}

export function statementReadySubject(payload: StatementReadyEmailPayload) {
  return `${payload.venueName} statement for ${payload.periodLabel}`
}

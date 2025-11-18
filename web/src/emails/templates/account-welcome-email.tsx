import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { CtaButton } from '@/emails/components/cta-button'
import type { AccountWelcomeEmailPayload } from '@/emails/types'

export function AccountWelcomeEmail(props: AccountWelcomeEmailPayload) {
  const previewText = 'Welcome to Interlude.'
  return (
    <EmailLayout
      previewText={previewText}
      title="Welcome in."
      intro={`${props.guestName ? `Hi ${props.guestName},` : 'Hi there,'} we saved your preferences and wallet.`}
    >
      <Section className="space-y-4">
        <Text className="text-base leading-6 text-[#1D1F1E]">
          Your profile’s ready to go: exclusive properties, faster approvals, saved guest details, and hold updates all in one place.
        </Text>
        <CtaButton href={props.manageUrl} label="Open Interlude" description="View your wallet, passes, and requests." />
        <Text className="text-sm leading-6 text-[#6F716D]">
          Got a venue in mind? Request a pass anytime—no extra forms, no repeated details.
        </Text>
        <Text className="text-sm leading-6 text-[#6F716D]">
          Need help? Just reply to this email or visit Support in the Interlude app.
        </Text>
      </Section>
    </EmailLayout>
  )
}

export function accountWelcomeSubject() {
  return 'Welcome to Interlude'
}

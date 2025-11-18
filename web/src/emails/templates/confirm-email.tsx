import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { CtaButton } from '@/emails/components/cta-button'
import type { ConfirmEmailPayload } from '@/emails/types'

export function ConfirmEmail(props: ConfirmEmailPayload) {
  const previewText = 'Confirm your Interlude email.'
  const greeting = props.recipient.name ? `Hi ${props.recipient.name.split(' ')[0]},` : 'Hi there,'

  return (
    <EmailLayout previewText={previewText} title="Confirm your email." intro={`${greeting} finish setting up your account.`}>
      <Section className="space-y-4">
        <Text className="text-base leading-6 text-[#1D1F1E]">
          Your profile is staged—confirm this email to unlock Interlude and receive booking updates.
        </Text>
        <CtaButton href={props.confirmUrl} label="Confirm email" description="Opens your secure Interlude link" />
        <Text className="text-sm leading-6 text-[#6F716D]">
          If the button doesn’t work, copy and paste this link into your browser:
        </Text>
        <Text className="text-sm leading-6 text-[#02374D] break-all">{props.confirmUrl}</Text>
        <Text className="text-sm leading-6 text-[#6F716D]">
          Need help? Reply to this email or visit{' '}
          <a href={props.supportUrl} className="text-[#02374D] underline-offset-4">
            Support
          </a>{' '}
          in the Interlude app.
        </Text>
      </Section>
    </EmailLayout>
  )
}

export function confirmEmailSubject() {
  return 'Confirm your email'
}

import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { CtaButton } from '@/emails/components/cta-button'
import type { PasswordResetEmailPayload } from '@/emails/types'

export function PasswordResetEmail(props: PasswordResetEmailPayload) {
  const previewText = 'Reset your Interlude password.'
  const greeting = props.recipient.name ? `Hi ${props.recipient.name.split(' ')[0]},` : 'Hi there,'

  return (
    <EmailLayout previewText={previewText} title="Reset your password." intro={`${greeting} here’s your secure link.`}>
      <Section className="space-y-4">
        <Text className="text-base leading-6 text-[#1D1F1E]">
          Tap the button below to set a new password. This link expires soon—request another if it times out.
        </Text>
        <CtaButton href={props.resetUrl} label="Reset password" description="Opens your secure Interlude link" />
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

export function passwordResetSubject() {
  return 'Reset your password'
}

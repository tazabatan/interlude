import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { CtaButton } from '@/emails/components/cta-button'
import type { PasswordChangedEmailPayload } from '@/emails/types'

export function PasswordChangedEmail(props: PasswordChangedEmailPayload) {
  const previewText = 'Your Interlude password changed.'
  const greeting = props.recipient.name ? `Hi ${props.recipient.name.split(' ')[0]},` : 'Hi there,'

  return (
    <EmailLayout previewText={previewText} title="Password updated." intro={`${greeting} we saved your new password.`}>
      <Section className="space-y-4">
        <Text className="text-base leading-6 text-[#1D1F1E]">
          This confirms your password changed just now. If you didn’t make this update, secure your account immediately.
        </Text>
        <CtaButton href={`${props.supportUrl}`} label="Secure my account" description="Opens support in the Interlude app" />
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

export function passwordChangedSubject() {
  return 'Your password was changed'
}

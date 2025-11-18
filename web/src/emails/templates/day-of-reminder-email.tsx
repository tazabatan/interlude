import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { DetailList } from '@/emails/components/detail-list'
import { CtaButton } from '@/emails/components/cta-button'
import { EmailQrCode } from '@/emails/components/qr-code'
import type { DayOfReminderEmailPayload } from '@/emails/types'

export function DayOfReminderEmail(props: DayOfReminderEmailPayload) {
  const previewText = `See you soon at ${props.venueName}.`
  const intro = props.guestName ? `Hi ${props.guestName},` : 'Hi there,'
  const details = [
    { label: 'Venue', value: props.venueName },
    { label: 'Pass', value: props.passName },
    { label: 'Arrival window', value: props.arrivalWindowDisplay },
    { label: 'Party size', value: `${props.partySize}` },
    { label: 'Hold amount', value: props.holdAmountDisplay },
  ]
  if (props.venueAddress) {
    details.push({ label: 'Address', value: props.venueAddress })
  }

  return (
    <EmailLayout previewText={previewText} title="Today is your day." intro={`${intro} your pass is active today.`}>
      <Section className="space-y-4">
        <Text className="text-base leading-6 text-[#1D1F1E]">
          Scan your QR code at arrival. If plans change, please cancel before your arrival window to avoid a no-show hold.
        </Text>
        <DetailList items={details} />
        {props.qrCodeValue ? (
          <EmailQrCode value={props.qrCodeValue} helperText="Have staff scan this QR when you arrive." />
        ) : null}
        <CtaButton href={props.walletUrl} label="Open wallet" />
        <Text className="text-sm leading-6 text-[#6F716D]">
          Holds authorize at 14:00 the day before your experience. They release automatically when staff scans your pass.
        </Text>
      </Section>
    </EmailLayout>
  )
}

export function dayOfReminderSubject(payload: DayOfReminderEmailPayload) {
  return `See you soon at ${payload.venueName}`
}

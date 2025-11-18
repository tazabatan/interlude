import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { DetailList } from '@/emails/components/detail-list'
import { CtaButton } from '@/emails/components/cta-button'
import { EmailQrCode } from '@/emails/components/qr-code'
import type { BookingApprovedEmailPayload } from '@/emails/types'

export function BookingApprovedEmail(props: BookingApprovedEmailPayload) {
  const previewText = `You're confirmed for ${props.venueName}.`
  const intro = props.guestName ? `Hi ${props.guestName},` : 'Hi there,'
  const summaryItems = [
    { label: 'Venue', value: props.venueName },
    { label: 'Pass', value: props.passName },
    { label: 'Arrival window', value: props.arrivalWindowDisplay },
    { label: 'Party size', value: `${props.partySize}` },
    { label: 'Hold amount', value: props.holdAmountDisplay },
    { label: 'Hold timing', value: props.holdChargeTimeDisplay },
  ]

  return (
    <EmailLayout previewText={previewText} title="You're confirmed." intro={`${intro} your pass has been approved.`}>
      <Section className="space-y-4">
        <Text className="text-base leading-6 text-[#1D1F1E]">
          Arrive during your window and show the QR code in your Interlude wallet. Holds are only captured for no-shows.
        </Text>
        <DetailList items={summaryItems} />
        {props.qrCodeValue ? (
          <EmailQrCode
            value={props.qrCodeValue}
            helperText="Show this code at arrival or open your Interlude wallet."
          />
        ) : null}
        <CtaButton href={props.walletUrl} label="View your pass" description="Opens your Interlude wallet" />
        <Text className="text-sm leading-6 text-[#6F716D]">
          Need to make a change? You can manage your booking any time before the hold window opens.
        </Text>
      </Section>
    </EmailLayout>
  )
}

export function bookingApprovedSubject(payload: BookingApprovedEmailPayload) {
  return `You're confirmed for ${payload.venueName}`
}

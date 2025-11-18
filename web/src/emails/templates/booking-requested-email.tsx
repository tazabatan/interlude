import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { DetailList } from '@/emails/components/detail-list'
import { CtaButton } from '@/emails/components/cta-button'
import type { BookingRequestedEmailPayload } from '@/emails/types'

export function BookingRequestedEmail(props: BookingRequestedEmailPayload) {
  const previewText = `We received your request for ${props.venueName}`
  const details = [
    { label: 'Venue', value: props.venueName },
    { label: 'Pass', value: props.passName },
    { label: 'Arrival window', value: props.arrivalWindowDisplay },
    { label: 'Party size', value: `${props.partySize}` },
    { label: 'Confirmation', value: props.confirmationNumber },
  ]

  return (
    <EmailLayout previewText={previewText} title="Request received." intro="We sent your request to the venue desk.">
      <Section className="space-y-4">
        <Text className="text-base leading-6 text-[#1D1F1E]">
          The desk will review everything within a few hours. You’ll get an approval or follow-up right here and in the app.
        </Text>
        <DetailList items={details} />
        <CtaButton href={props.manageUrl} label="View request" description="Opens the Interlude app" />
        <Text className="text-sm leading-6 text-[#6F716D]">
          Need to update guest details? You can edit or cancel anytime before the venue issues the pass.
        </Text>
      </Section>
    </EmailLayout>
  )
}

export function bookingRequestedSubject(payload: BookingRequestedEmailPayload) {
  return `Request received for ${payload.venueName}`
}

import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { DetailList } from '@/emails/components/detail-list'
import { CtaButton } from '@/emails/components/cta-button'
import type { BookingRequestedVenueEmailPayload } from '@/emails/types'

export function BookingRequestedVenueEmail(props: BookingRequestedVenueEmailPayload) {
  const previewText = `New request from ${props.guestName} · ${props.passName}`
  const details = [
    { label: 'Guest', value: props.guestName },
    ...(props.guestEmail ? [{ label: 'Email', value: props.guestEmail }] : []),
    { label: 'Pass', value: props.passName },
    { label: 'Arrival window', value: props.arrivalWindowDisplay },
    { label: 'Party size', value: `${props.partySize}` },
  ]

  return (
    <EmailLayout previewText={previewText} title="New request received." intro={`${props.venueName} has a new booking to review.`}>
      <Section className="space-y-4">
        <Text className="text-base leading-6 text-[#1D1F1E]">
          Review the details and approve or follow up with the guest. Requests expire if left unanswered.
        </Text>
        <DetailList items={details} />
        <CtaButton href={props.reviewUrl} label="Review request" description="Opens the venue desk" />
        <Text className="text-sm leading-6 text-[#6F716D]">
          Tip: reply quickly to keep approval rates high. You can update arrival windows or guest counts before issuing.
        </Text>
      </Section>
    </EmailLayout>
  )
}

export function bookingRequestedVenueSubject(payload: BookingRequestedVenueEmailPayload) {
  return `New request · ${payload.passName}`
}

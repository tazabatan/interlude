import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { DetailList } from '@/emails/components/detail-list'
import { CtaButton } from '@/emails/components/cta-button'
import type { BookingDeclinedEmailPayload } from '@/emails/types'

export function BookingDeclinedEmail(props: BookingDeclinedEmailPayload) {
  const previewText = `${props.venueName} couldn’t host you`
  const details = [
    { label: 'Venue', value: props.venueName },
    { label: 'Pass', value: props.passName },
    { label: 'Arrival window', value: props.arrivalWindowDisplay },
    { label: 'Party size', value: `${props.partySize}` },
  ]

  return (
    <EmailLayout previewText={previewText} title="This request was declined." intro="We couldn’t secure this pass.">
      <Section className="space-y-4">
        {props.declineReason ? (
          <Text className="text-base leading-6 text-[#1D1F1E]">
            Desk notes: <strong>{props.declineReason}</strong>
          </Text>
        ) : (
          <Text className="text-base leading-6 text-[#1D1F1E]">
            The desk couldn’t accommodate the request. Try another arrival window or pick a different venue.
          </Text>
        )}
        <DetailList items={details} />
        <CtaButton href={props.manageUrl} label="Find another pass" description="Browse other venues in Interlude" />
      </Section>
    </EmailLayout>
  )
}

export function bookingDeclinedSubject(payload: BookingDeclinedEmailPayload) {
  return `Update on ${payload.venueName}`
}

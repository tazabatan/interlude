import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { DetailList } from '@/emails/components/detail-list'
import { CtaButton } from '@/emails/components/cta-button'
import type { BookingCancelledEmailPayload } from '@/emails/types'

export function BookingCancelledEmail(props: BookingCancelledEmailPayload) {
  const byDesk = props.cancelledBy === 'venue'
  const previewText = byDesk
    ? `${props.venueName} cancelled your pass`
    : `You cancelled ${props.venueName}`
  const title = byDesk ? 'Pass cancelled by the venue.' : 'You cancelled your pass.'
  const intro = byDesk
    ? "We let the venue know your pass is no longer active. If you'd like to rebook, browse the app anytime."
    : 'We cancelled this booking. Your spot is released and any holds will void automatically.'

  const details = [
    { label: 'Venue', value: props.venueName },
    { label: 'Pass', value: props.passName },
    { label: 'Arrival window', value: props.arrivalWindowDisplay },
    { label: 'Party size', value: `${props.partySize}` },
  ]

  return (
    <EmailLayout previewText={previewText} title={title} intro={intro}>
      <Section className="space-y-4">
        {byDesk && props.actorName ? (
          <Text className="text-base leading-6 text-[#1D1F1E]">
            Desk contact: <strong>{props.actorName}</strong>
          </Text>
        ) : null}
        <DetailList items={details} />
        <CtaButton
          href={props.manageUrl}
          label={byDesk ? 'Find a new pass' : 'View bookings'}
          description="Opens your Interlude wallet"
        />
      </Section>
    </EmailLayout>
  )
}

export function bookingCancelledSubject(payload: BookingCancelledEmailPayload) {
  return payload.cancelledBy === 'venue'
    ? `${payload.venueName} cancelled your pass`
    : `You cancelled ${payload.venueName}`
}

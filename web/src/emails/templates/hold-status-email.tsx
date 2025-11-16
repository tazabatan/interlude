import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { DetailList } from '@/emails/components/detail-list'
import { CtaButton } from '@/emails/components/cta-button'
import type { HoldStatusEmailPayload } from '@/emails/types'

const statusCopy: Record<
  HoldStatusEmailPayload['variant'],
  { title: string; intro: string; body: string; ctaLabel: string }
> = {
  authorized: {
    title: 'Hold scheduled.',
    intro: 'We scheduled your hold.',
    body: 'Your no-show hold has been authorized. Nothing is charged unless the venue marks your pass as a no-show.',
    ctaLabel: 'View booking',
  },
  released: {
    title: 'Hold released.',
    intro: 'Your hold was released.',
    body: 'Thanks for tapping in. The hold has been voided and will disappear from your card statement shortly.',
    ctaLabel: 'View receipt',
  },
  captured: {
    title: 'Hold captured.',
    intro: 'We captured the hold.',
    body: 'The venue reported a no-show, so we captured the hold. Reply if you believe this is in error.',
    ctaLabel: 'Review details',
  },
}

export function HoldStatusEmail(props: HoldStatusEmailPayload) {
  const copy = statusCopy[props.variant]
  const previewText = `${copy.intro} ${props.venueName}`
  const details = [
    { label: 'Venue', value: props.venueName },
    { label: 'Pass', value: props.passName },
    { label: 'Hold amount', value: props.holdAmountDisplay },
    { label: 'Status date', value: props.statusDateDisplay },
  ]

  return (
    <EmailLayout previewText={previewText} title={copy.title} intro={copy.body}>
      <Section className="space-y-4">
        <DetailList items={details} />
        <CtaButton href={props.manageUrl} label={copy.ctaLabel} description="Opens booking details in Interlude" />
        <Text className="text-sm leading-6 text-[#6F716D]">
          Questions? Reply to this email or contact Interlude support.
        </Text>
      </Section>
    </EmailLayout>
  )
}

export function holdStatusSubject(payload: HoldStatusEmailPayload) {
  switch (payload.variant) {
    case 'authorized':
      return `We scheduled your hold for ${payload.venueName}`
    case 'released':
      return `Your hold was released for ${payload.venueName}`
    case 'captured':
      return `Hold captured for ${payload.venueName}`
    default:
      return `Update for ${payload.venueName}`
  }
}

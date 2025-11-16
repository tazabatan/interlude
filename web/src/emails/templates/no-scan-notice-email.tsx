import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { DetailList } from '@/emails/components/detail-list'
import { CtaButton } from '@/emails/components/cta-button'
import type { NoScanNoticeEmailPayload } from '@/emails/types'

export function NoScanNoticeEmail(props: NoScanNoticeEmailPayload) {
  const previewText = `We didn't see a scan at ${props.venueName}.`
  const details = [
    { label: 'Venue', value: props.venueName },
    { label: 'Pass', value: props.passName },
    { label: 'Arrival window', value: props.arrivalWindowDisplay },
    { label: 'Review deadline', value: props.reviewDeadlineDisplay },
  ]

  return (
    <EmailLayout
      previewText={previewText}
      title="Did you attend?"
      intro="We didn't receive a scan for your pass. If you attended, let us know and we'll pause the no-show review."
    >
      <Section className="space-y-4">
        <DetailList items={details} />
        <CtaButton href={props.claimUrl} label="I attended" description="Share a quick note or photo of your receipt" />
        <Text className="text-sm leading-6 text-[#6F716D]">
          No response is needed if you missed the visit—we'll finalize the no-show after the deadline. Reply if you need help.
        </Text>
      </Section>
    </EmailLayout>
  )
}

export function noScanSubject(payload: NoScanNoticeEmailPayload) {
  return `Did you attend ${payload.venueName}?`
}

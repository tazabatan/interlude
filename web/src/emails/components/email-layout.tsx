import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'
import type { ReactNode } from 'react'

type EmailLayoutProps = {
  previewText: string
  title: string
  intro?: string | null
  children: ReactNode
  footerNote?: ReactNode
}

const currentYear = new Date().getFullYear()

export function EmailLayout({ previewText, title, intro, children, footerNote }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-[#F6F3EE] font-sans text-[#1D1F1E]">
          <Container className="mx-auto my-10 w-full max-w-[540px] rounded-[32px] bg-white px-8 py-10 shadow-[0_20px_90px_rgba(2,55,77,0.08)]">
            <Section className="mb-6">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.4em] text-[#6F716D]">Interlude</Text>
              <Text className="mt-3 text-3xl font-semibold leading-tight text-[#02374D]">{title}</Text>
              {intro ? <Text className="mt-4 text-base leading-6 text-[#1D1F1E]">{intro}</Text> : null}
            </Section>

            {children}

            <Section className="mt-8">
              <Hr className="my-6 border border-[#E8E4D7]" />
              {footerNote ?? (
                <Text className="text-sm leading-6 text-[#6F716D]">
                  Need help? Reply to this email or visit the support page in the Interlude app.
                </Text>
              )}
              <Text className="mt-4 text-xs uppercase tracking-[0.3em] text-[#C2BEB3]">{`© ${currentYear} Interlude`}</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

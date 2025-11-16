import { Link, Section, Text } from '@react-email/components'

type CtaButtonProps = {
  href: string
  label: string
  description?: string
}

export function CtaButton({ href, label, description }: CtaButtonProps) {
  return (
    <Section className="my-6 text-center">
      <Link
        href={href}
        className="inline-block rounded-full bg-[#02374D] px-8 py-3 text-base font-semibold text-white no-underline"
      >
        {label}
      </Link>
      {description ? <Text className="mt-3 text-sm text-[#6F716D]">{description}</Text> : null}
    </Section>
  )
}

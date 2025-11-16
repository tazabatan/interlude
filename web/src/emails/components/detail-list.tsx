import { Section, Text } from '@react-email/components'

type DetailItem = {
  label: string
  value: string
}

type DetailListProps = {
  items: DetailItem[]
}

export function DetailList({ items }: DetailListProps) {
  return (
    <Section className="rounded-[24px] bg-[#F6F3EE] px-6 py-5">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`flex flex-col gap-1 border-[#E1DDD2] py-3 text-sm text-[#1D1F1E] ${index === 0 ? '' : 'border-t'}`}
        >
          <Text className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6F716D]">
            {item.label}
          </Text>
          <Text className="text-base font-medium text-[#02374D]">{item.value}</Text>
        </div>
      ))}
    </Section>
  )
}

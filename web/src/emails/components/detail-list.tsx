import { Section, Text } from '@react-email/components'
import type { CSSProperties } from 'react'

type DetailItem = {
  label: string
  value: string
}

type DetailListProps = {
  items: DetailItem[]
}

const containerStyle: CSSProperties = {
  paddingTop: '12px',
  paddingBottom: '12px',
}

const itemStyle: CSSProperties = {
  paddingTop: '12px',
  paddingBottom: '12px',
  borderTop: '1px solid #E1DDD2',
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '11px',
  lineHeight: '24px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.3em',
  color: '#6F716D',
  margin: 0,
  marginBottom: '4px',
}

const valueStyle: CSSProperties = {
  display: 'block',
  fontSize: '16px',
  lineHeight: '24px',
  fontWeight: 400,
  color: '#000000',
  margin: 0,
}

export function DetailList({ items }: DetailListProps) {
  return (
    <Section style={containerStyle}>
      {items.map((item, index) => (
        <div key={item.label} style={{ ...itemStyle, borderTop: index === 0 ? 'none' : itemStyle.borderTop }}>
          <Text style={labelStyle}>{item.label}</Text>
          <Text style={valueStyle}>{item.value}</Text>
        </div>
      ))}
    </Section>
  )
}

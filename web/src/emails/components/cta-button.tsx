import { Link, Section, Text } from '@react-email/components'
import type { CSSProperties } from 'react'

type CtaButtonProps = {
  href: string
  label: string
  description?: string
}

const buttonStyle: CSSProperties = {
  display: 'inline-block',
  borderRadius: '999px',
  backgroundColor: '#050505',
  padding: '16px 32px',
  color: '#FFFFFF',
  fontSize: '15px',
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  textAlign: 'center',
  lineHeight: '1.3',
}

const buttonCellStyle: CSSProperties = {
  textAlign: 'center',
  width: '100%',
  padding: 0,
}

const descriptionStyle: CSSProperties = {
  margin: '12px 0 0',
  fontSize: '14px',
  color: '#000000',
}

export function CtaButton({ href, label, description }: CtaButtonProps) {
  return (
    <Section className="my-6 text-center">
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr>
            <td style={buttonCellStyle}>
              <Link href={href} style={buttonStyle}>
                {label}
              </Link>
            </td>
          </tr>
        </tbody>
      </table>
      {description ? <Text style={descriptionStyle}>{description}</Text> : null}
    </Section>
  )
}

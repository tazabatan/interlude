import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'
import { Font } from '@react-email/font'
import type { CSSProperties, ReactNode } from 'react'

type EmailLayoutProps = {
  previewText: string
  title: string
  intro?: string | null
  children: ReactNode
  footerNote?: ReactNode
}

const currentYear = new Date().getFullYear()
const BRAND_CREAM = '#F4F1E7'
const BORDER_COLOR = '#E1D9C8'
const TEXT_COLOR = '#000000'
const MUTED_TEXT = '#6F716D'
const HEADING_COLOR = '#050505'

function getAssetBaseUrl() {
  const envBase =
    process.env.NEXT_PUBLIC_EMAIL_ASSET_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://interludepass.com'
  return envBase.replace(/\/$/, '')
}

const assetBaseUrl = getAssetBaseUrl()
const logoUrl = `${assetBaseUrl}/interlude-logo.png`
const montserratUrl = `${assetBaseUrl}/emails/fonts/montserrat-latin.woff2`

const bodyStyle: CSSProperties = {
  backgroundColor: BRAND_CREAM,
  margin: 0,
  padding: '32px 0',
  fontFamily: 'Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif',
  color: TEXT_COLOR,
  width: '100%',
}

const containerStyle: CSSProperties = {
  width: '100%',
  maxWidth: '560px',
  backgroundColor: BRAND_CREAM,
  padding: '48px 44px',
  margin: '0 auto',
}

const headerSectionStyle: CSSProperties = {
  marginBottom: '16px',
}

const headingStyle: CSSProperties = {
  fontSize: '26px',
  lineHeight: '34px',
  color: HEADING_COLOR,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 400,
  margin: '0',
}

const introStyle: CSSProperties = {
  margin: '16px 0 0',
  fontSize: '16px',
  lineHeight: '26px',
  color: TEXT_COLOR,
}

const footerNoteStyle: CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: MUTED_TEXT,
  margin: 0,
}

const footerMetaStyle: CSSProperties = {
  marginTop: '16px',
  fontSize: '11px',
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
  color: '#888378',
}

export function EmailLayout({ previewText, title, intro, children, footerNote }: EmailLayoutProps) {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Montserrat"
          fontWeight={400}
          fallbackFontFamily={['Helvetica', 'Arial', 'sans-serif']}
          webFont={{
            url: montserratUrl,
            format: 'woff2',
          }}
        />
        <Font
          fontFamily="Montserrat"
          fontWeight={500}
          fallbackFontFamily={['Helvetica', 'Arial', 'sans-serif']}
          webFont={{
            url: montserratUrl,
            format: 'woff2',
          }}
        />
        <Font
          fontFamily="Montserrat"
          fontWeight={600}
          fallbackFontFamily={['Helvetica', 'Arial', 'sans-serif']}
          webFont={{
            url: montserratUrl,
            format: 'woff2',
          }}
        />
      </Head>
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body style={bodyStyle}>
          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: BRAND_CREAM }}>
            <tbody>
              <tr>
                <td>
                  <Container style={containerStyle}>
            <Section style={headerSectionStyle}>
              <Img src={logoUrl} alt="Interlude" width={180} style={{ display: 'block', margin: '0 auto 24px', height: 'auto' }} />
              <Hr style={{ borderColor: BORDER_COLOR, margin: '0 0 24px' }} />
              <Text style={headingStyle}>{title.toUpperCase()}</Text>
              {intro ? <Text style={introStyle}>{intro}</Text> : null}
            </Section>

            {children}

            <Section style={{ marginTop: '32px' }}>
              <Hr style={{ borderColor: BORDER_COLOR, margin: '24px 0' }} />
              {footerNote ?? (
                <Text style={footerNoteStyle}>
                  Need help? Reply to this email or visit the support page in the Interlude app.
                </Text>
              )}
              <Text style={footerMetaStyle}>{`© ${currentYear} Interlude`}</Text>
            </Section>
                  </Container>
                </td>
              </tr>
            </tbody>
          </table>
        </Body>
      </Tailwind>
    </Html>
  )
}

import { Section, Text } from '@react-email/components'
import QRCode from 'qrcode'
import type { CSSProperties } from 'react'

type EmailQrCodeProps = {
  value: string
  helperText?: string
}

const wrapperStyle: CSSProperties = {
  marginTop: '12px',
  marginBottom: '12px',
  textAlign: 'center',
}

const labelStyle: CSSProperties = {
  fontSize: '12px',
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
  color: '#6F716D',
  marginBottom: '12px',
}

const helperStyle: CSSProperties = {
  marginTop: '12px',
  fontSize: '13px',
  color: '#000000',
}

function renderQrMatrix(value: string) {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' })
  const size = qr.modules.size
  const cellSize = 8
  const rows = []
  for (let row = 0; row < size; row += 1) {
    const cells = []
    for (let col = 0; col < size; col += 1) {
      const isDark = qr.modules.get(row, col)
      cells.push(
        <td
          key={`${row}-${col}`}
          style={{
            width: `${cellSize}px`,
            height: `${cellSize}px`,
            backgroundColor: isDark ? '#050505' : '#FFFFFF',
            padding: 0,
            margin: 0,
          }}
        />
      )
    }
    rows.push(<tr key={`row-${row}`}>{cells}</tr>)
  }

  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      style={{
        borderCollapse: 'collapse',
        margin: '0 auto',
        border: '1px solid #E1D9C8',
        backgroundColor: '#FFFFFF',
        padding: '12px',
      }}
    >
      <tbody>{rows}</tbody>
    </table>
  )
}

export function EmailQrCode({ value, helperText }: EmailQrCodeProps) {
  return (
    <Section style={wrapperStyle}>
      <Text style={labelStyle}>Your Arrival QR</Text>
      {renderQrMatrix(value)}
      {helperText ? <Text style={helperStyle}>{helperText}</Text> : null}
    </Section>
  )
}

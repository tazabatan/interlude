 'use client'

import { useMemo, useState } from 'react'
import QRCode from 'react-qr-code'

type Props = {
  venueName: string
  token: string | null
  generatedAt: string | null
  registrationUrl: string | null
}

export default function ScannerClient({ venueName, token, generatedAt, registrationUrl }: Props) {
  const [copied, setCopied] = useState(false)
  const dateLabel = useMemo(() => {
    if (!generatedAt) return null
    const date = new Date(generatedAt)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }, [generatedAt])

  const handleCopy = async () => {
    if (!registrationUrl) return
    try {
      await navigator.clipboard.writeText(registrationUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  if (!token || !registrationUrl) {
    return (
      <div className="rounded-2xl border border-dashed border-[#CFCBB8] bg-[#FAF7EE] p-4 text-sm text-[#4F514D]">
        <p>No device token yet. Generate one above to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1.2fr,1fr]">
      <div className="space-y-3 rounded-2xl border border-[#E8E4D7] bg-[#F9F6ED] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">Share this link</p>
        <p className="break-all font-mono text-sm text-[#02374D]">{registrationUrl}</p>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full border border-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        {dateLabel ? <p className="text-xs text-[#6F716D]">Generated {dateLabel}</p> : null}
      </div>
      <div className="space-y-3 rounded-2xl border border-[#E8E4D7] bg-white p-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">Registration QR</p>
        <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-inner">
          <QRCode value={registrationUrl} size={180} />
        </div>
        <p className="text-sm text-[#4F514D]">
          Staff scan this once per device to authorize camera scanning at {venueName}.
        </p>
      </div>
    </div>
  )
}

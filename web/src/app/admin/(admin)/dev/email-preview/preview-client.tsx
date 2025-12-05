'use client'

import { useEffect, useRef, useState } from 'react'
type EmailPreviewTemplate = {
  key: string
  label: string
}

type Props = {
  templates: EmailPreviewTemplate[]
  currentEmail: string
}

export default function EmailPreviewClient({ templates, currentEmail }: Props) {
  const [overrideEmail, setOverrideEmail] = useState(currentEmail)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState<string | null>(null)
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const handlePreview = async (key: string) => {
    setLoadingKey(key + '-preview')
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/internal/email-preview/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      if (!res.ok) {
        throw new Error(await res.text())
      }
      const data = (await res.json()) as { html: string }
      setPreviewHtml(data.html)
      setPreviewKey(key)
    } catch (err) {
      setError('Failed to load preview')
      console.error(err)
    } finally {
      setLoadingKey(null)
    }
  }

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !previewHtml) return

    const resize = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document
        const height = doc?.documentElement?.scrollHeight || doc?.body?.scrollHeight
        if (height) {
          iframe.style.height = `${Math.min(height + 32, 1000)}px`
        }
      } catch (err) {
        console.warn('Failed to size preview iframe', err)
      }
    }

    iframe.addEventListener('load', resize)
    resize()
    return () => {
      iframe.removeEventListener('load', resize)
    }
  }, [previewHtml, previewKey])

  const handleSend = async (key: string) => {
    setLoadingKey(key + '-send')
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/internal/email-preview/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, email: overrideEmail || currentEmail }),
      })
      if (!res.ok) {
        throw new Error(await res.text())
      }
      setMessage('Email sent!')
    } catch (err) {
      setError('Failed to send email')
      console.error(err)
    } finally {
      setLoadingKey(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#E8E4D7] bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Current user email</p>
            <p className="mt-1 rounded-2xl border border-[#E8E4D7] bg-[#F9F6ED] px-4 py-3 text-sm text-[#02374D]">
              {currentEmail || 'Not signed in'}
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">
              Send to (optional override)
              <input
                type="email"
                value={overrideEmail}
                onChange={(event) => setOverrideEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#E8E4D7] bg-[#FFFCF5] px-4 py-3 text-sm text-[#02374D] shadow-[0px_2px_8px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-[#02374D]/30"
                placeholder="you@example.com"
              />
            </label>
          </div>
        </div>
      </div>

      {message ? <p className="rounded-full bg-[#D0F3EA] px-4 py-2 text-sm text-[#035C4C]">{message}</p> : null}
      {error ? <p className="rounded-full bg-[#FCE1E1] px-4 py-2 text-sm text-[#B4231F]">{error}</p> : null}

      <div className="overflow-hidden rounded-3xl border border-[#E8E4D7] bg-white shadow-sm">
        <table className="min-w-full divide-y divide-[#E8E4D7] text-sm">
          <thead className="bg-[#F9F6ED] text-left text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
            <tr>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E4D7]">
            {templates.map((template) => (
              <tr key={template.key}>
                <td className="px-4 py-3 font-medium text-[#02374D]">{template.label}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#6F716D]">{template.key}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
                    <button
                      type="button"
                      onClick={() => handlePreview(template.key)}
                      disabled={Boolean(loadingKey)}
                      className="rounded-full border border-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white disabled:opacity-50"
                    >
                      {loadingKey === template.key + '-preview' ? 'Loading…' : 'Preview HTML'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSend(template.key)}
                      disabled={Boolean(loadingKey)}
                      className="rounded-full bg-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#02486A] disabled:opacity-50"
                    >
                      {loadingKey === template.key + '-send' ? 'Sending…' : 'Send to me'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {previewHtml ? (
        <div className="rounded-3xl border border-[#E8E4D7] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Previewing: {previewKey}</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[#E8E4D7] bg-[#F9F6ED]">
            <iframe
              key={previewKey ?? 'email-preview'}
              ref={iframeRef}
              title={`email-preview-${previewKey ?? 'template'}`}
              srcDoc={previewHtml}
              className="w-full border-0 bg-transparent"
              style={{ minHeight: '480px' }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

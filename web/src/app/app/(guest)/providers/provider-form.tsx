'use client'

import { useState } from 'react'

type FormState = 'idle' | 'submitting' | 'success' | 'error'

const PROVIDER_TYPES = [
  { value: 'hotel_resort', label: 'Hotel / Resort' },
  { value: 'boat_company', label: 'Boat / Yacht' },
  { value: 'private_chef', label: 'Private Chef' },
  { value: 'experience', label: 'Experience' },
  { value: 'other', label: 'Other' },
]

export default function ProviderForm() {
  const [formState, setFormState] = useState<FormState>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (formState === 'submitting') return

    setFormState('submitting')
    setError(null)

    const formData = new FormData(event.currentTarget)
    const payload = {
      name: (formData.get('name') as string) || '',
      email: (formData.get('email') as string) || '',
      company: (formData.get('company') as string) || '',
      providerType: (formData.get('providerType') as string) || '',
      location: (formData.get('location') as string) || '',
      website: (formData.get('website') as string) || '',
      phone: (formData.get('phone') as string) || '',
      message: (formData.get('message') as string) || '',
    }

    try {
      const res = await fetch('/api/provider-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error || 'Unable to submit right now')
      }

      setFormState('success')
      event.currentTarget.reset()
    } catch (submitError) {
      console.error('Provider form submit failed', submitError)
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit right now')
      setFormState('error')
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
      <div className="space-y-5 text-black">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Why partner</p>
          <h2 className="text-2xl font-normal uppercase tracking-[0.05em] text-black">A new revenue stream, curated</h2>
        </div>
        <ul className="space-y-3 text-sm leading-relaxed text-[#4F514D]">
          <li>Reach high-intent guests who book day access, dining, and on-property experiences.</li>
          <li>Transparent payouts, configurable caps, and fast approvals through the Interlude desk.</li>
          <li>Concierge support for boats and chefs; instant requests for hotels and resorts.</li>
        </ul>
        <div className="rounded-[18px] border border-[#E8E4D7] bg-[#F4F1E7] px-5 py-4 text-sm text-black shadow-[0px_10px_30px_rgba(0,0,0,0.06)]">
          We’ll review your details and follow up within one business day.
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-[24px] border border-[#E8E4D7] bg-[#F4F1E7] px-6 py-7 shadow-[0px_14px_44px_rgba(0,0,0,0.08)]"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name" name="name" type="text" autoComplete="name" />
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Field label="Company / Property" name="company" type="text" autoComplete="organization" />
          <Field label="Location" name="location" type="text" placeholder="City, Country" />
          <Field label="Phone" name="phone" type="tel" autoComplete="tel" />
          <Field label="Website" name="website" type="url" autoComplete="url" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Provider Type</label>
            <select
              name="providerType"
              className="w-full rounded-[14px] border border-[#E8E4D7] bg-[#FFFCF5] px-4 py-3 text-sm text-[#02374D] outline-none transition focus:border-[#02374D]"
              defaultValue={PROVIDER_TYPES[0]?.value}
            >
              {PROVIDER_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Tell us more</label>
            <textarea
              name="message"
              rows={4}
              className="w-full rounded-[14px] border border-[#E8E4D7] bg-[#FFFCF5] px-4 py-3 text-sm text-[#02374D] outline-none transition focus:border-[#02374D]"
              placeholder="Capacity, amenities, or any questions."
            />
          </div>
        </div>

        {error && <div className="rounded-[12px] bg-[#FDECEA] px-4 py-3 text-sm text-[#9B1C1C]">{error}</div>}
        {formState === 'success' && (
          <div className="rounded-[12px] bg-[#E8F5E9] px-4 py-3 text-sm text-[#1B5E20]">
            Thanks for reaching out — we’ll get back to you within one business day.
          </div>
        )}

        <button
          type="submit"
          disabled={formState === 'submitting'}
          className="inline-flex w-full items-center justify-center rounded-full bg-[#02374D] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-[#02486A] disabled:cursor-not-allowed disabled:bg-[#7B9AAA]"
        >
          {formState === 'submitting' ? 'Sending…' : 'Submit'}
        </button>
      </form>
    </div>
  )
}

function Field({
  label,
  name,
  type,
  required,
  placeholder,
  autoComplete,
}: {
  label: string
  name: string
  type: string
  required?: boolean
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[#6F716D]" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-[14px] border border-[#E8E4D7] bg-[#FFFCF5] px-4 py-3 text-sm text-[#02374D] outline-none transition focus:border-[#02374D]"
      />
    </div>
  )
}

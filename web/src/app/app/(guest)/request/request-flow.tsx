"use client"

import { useMemo, useState, FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase/client"

type Summary = {
  passId: string
  dateIso: string
  dateDisplay: string
  arrivalTimeLabel: string
  venueName: string
  destination: string
  passLabel: string
  partySize: number
  partySizeLabel: string
  guestAgeDetails?: string[] | null
  guestAgesComplete: boolean
  priceLabel: string
  taxLabel: string
  totalLabel: string
  dueNowLabel: string
  currency: string
  cancellationCopy: string
  paymentCopy: string
}

type ContactDefaults = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

type RequestFlowProps = {
  summary: Summary
  contactDefaults: ContactDefaults
  passId: string
  dateIso: string
  partySize: number
  arrivalTime: string | null
  guestAges: string[]
  isAuthenticated: boolean
  authRedirectUrl: string
}

type Step = "account" | "confirm" | "pay"

export default function RequestFlow({
  summary,
  contactDefaults,
  passId,
  dateIso,
  partySize,
  arrivalTime,
  guestAges,
  isAuthenticated,
  authRedirectUrl,
}: RequestFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(isAuthenticated ? "confirm" : "account")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contact, setContact] = useState(contactDefaults)
  const [payment, setPayment] = useState({
    cardNumber: "",
    expiry: "",
    cvc: "",
    country: "United States",
    postal: "",
    cardFirstName: contactDefaults.firstName,
    cardLastName: contactDefaults.lastName,
  })

  const trackerStep = step === "account" ? 1 : step === "confirm" ? 2 : 3
  const backHref = `/app/venue/${summary.passId}?date=${summary.dateIso}`
  const guestAgesMissing = !summary.guestAgesComplete

  const summaryList = useMemo(() => {
    const rows = [
      { label: "Pass", value: summary.passLabel },
      { label: "Date", value: summary.dateDisplay },
      { label: "Arrival time", value: summary.arrivalTimeLabel },
      { label: "Guests", value: summary.partySizeLabel },
    ]
    if (summary.guestAgeDetails && summary.guestAgeDetails.length > 0) {
      rows.push({ label: "Guest ages", value: summary.guestAgeDetails.join(', ') })
    }
    rows.push(
      { label: "Price", value: summary.priceLabel },
      { label: "Tax", value: summary.taxLabel },
      { label: "Cancellation", value: summary.cancellationCopy },
      { label: "Payment", value: summary.paymentCopy },
    )
    return rows
  }, [summary])

  const startPaymentStep = () => {
    if (guestAgesMissing) {
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }
    setStep("pay")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleCompleteBooking = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const supabase = supabaseBrowser()
      const { data: bookingId, error: rpcError } = await supabase.rpc("fn_request_booking", {
        _pass_id: passId,
        _date: dateIso,
        _party_size: partySize,
        _arrival_time: arrivalTime,
        _guest_ages: guestAges.join(","),
      })
      if (rpcError) {
        throw rpcError
      }
      if (typeof bookingId === "string") {
        fetch("/api/request/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        }).catch((notifyError) => console.error("request notify error", notifyError))
      }
      router.push("/app")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong"
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (step === "account") {
  return (
    <div className="space-y-8">
      <StepIndicator current={1} />
        <section className="rounded-[32px] border border-[#E8E4D7] bg-[#F9F6ED] p-10 shadow-[0px_4px_23px_rgba(0,0,0,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Make the most of Interlude</p>
          <h1 className="mt-4 text-3xl font-semibold uppercase tracking-[0.05em] text-black">
            Create a free account to track every request.
          </h1>
          <p className="mt-3 text-lg text-[#4F514D]">
            Members check in faster, save their preferences, and never lose sight of a request. Prefer to breeze through?
            Checkout as a guest—your details stay on this device only.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href={authRedirectUrl}
              className="flex-1 rounded-full bg-[#02374D] px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#02486A]"
            >
              Create account
            </Link>
            <button
              type="button"
              onClick={() => setStep("confirm")}
              className="flex-1 rounded-full border border-[#02374D] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white"
            >
              Checkout as guest
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <div className="relative flex items-center">
        <BackButton href={backHref} />
        <div className="absolute left-1/2 -translate-x-1/2">
          <StepIndicator current={trackerStep} />
        </div>
      </div>

      {step === "confirm" ? (
        <section className="flex gap-6 w-full">
          <div className="flex-[2] space-y-6 min-w-0">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">{summary.destination}</p>
              <h1 className="text-3xl font-medium uppercase tracking-[0.02em] text-black break-words">{summary.venueName}</h1>
            </div>
            <div className="h-px bg-[#DBD8C9]" />
            <dl className="space-y-6 text-sm">
              {summaryList.map((row) => (
                <div key={row.label} className="flex items-baseline gap-6">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D] w-[160px] shrink-0">{row.label}</dt>
                  <dd className="text-base text-black flex-1">{row.value}</dd>
                </div>
              ))}
            </dl>
            <div className="h-px bg-[#DBD8C9]" />
            <div className="flex flex-col gap-4 text-black">
              <div className="flex items-baseline justify-between">
                <p className="text-xl uppercase tracking-[0.05em]">Total Price (inc. taxes and fees)</p>
                <p className="text-xl">{summary.totalLabel}</p>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-xl uppercase tracking-[0.05em]">Due now</p>
                <p className="text-xl">{summary.dueNowLabel}</p>
              </div>
            </div>
            <div className="h-px bg-[#DBD8C9]" />
            <button
              type="button"
              onClick={startPaymentStep}
              disabled={guestAgesMissing}
              className="self-start rounded-full bg-[#02374D] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#02486A] disabled:cursor-not-allowed disabled:bg-[#6F716D]"
            >
              Confirm booking
            </button>
            {guestAgesMissing && (
              <p className="text-sm text-[#B4231F]">
                Add an age for each guest before confirming. Use the back arrow to edit your party details.
              </p>
            )}
          </div>
          <div className="flex-[1] min-w-0">
            <SummaryPanel
              summary={summary}
              primaryCtaLabel="Confirm booking"
              onPrimaryClick={startPaymentStep}
              ctaDisabled={guestAgesMissing}
            />
          </div>
        </section>
      ) : (
        <section className="flex gap-6 w-full">
          <form
            className="flex-[2] space-y-8 rounded-[32px] border border-[#E8E4D7] bg-[#FFFCF5] p-8 shadow-[0px_4px_23px_rgba(0,0,0,0.15)] min-w-0 overflow-hidden"
            onSubmit={handleCompleteBooking}
          >
            <div className="space-y-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Contact information</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="First name"
                  value={contact.firstName}
                  onChange={(value) => setContact((prev) => ({ ...prev, firstName: value }))}
                />
                <InputField
                  label="Last name"
                  value={contact.lastName}
                  onChange={(value) => setContact((prev) => ({ ...prev, lastName: value }))}
                />
              </div>
              <InputField
                label="Phone number"
                value={contact.phone}
                onChange={(value) => setContact((prev) => ({ ...prev, phone: value }))}
              />
              <InputField
                label="Email for booking updates"
                value={contact.email}
                onChange={(value) => setContact((prev) => ({ ...prev, email: value }))}
              />
            </div>

            <div className="space-y-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Payment information</h2>
              <InputField
                label="Card number"
                value={payment.cardNumber}
                onChange={(value) => setPayment((prev) => ({ ...prev, cardNumber: value }))}
                placeholder="•••• •••• •••• ••••"
              />
              <div className="grid gap-4 md:grid-cols-3">
                <InputField
                  label="MM/YY"
                  value={payment.expiry}
                  onChange={(value) => setPayment((prev) => ({ ...prev, expiry: value }))}
                  placeholder="MM/YY"
                />
                <InputField
                  label="CVC"
                  value={payment.cvc}
                  onChange={(value) => setPayment((prev) => ({ ...prev, cvc: value }))}
                  placeholder="123"
                />
                <InputField
                  label="Postal code"
                  value={payment.postal}
                  onChange={(value) => setPayment((prev) => ({ ...prev, postal: value }))}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="Cardholder first name"
                  value={payment.cardFirstName}
                  onChange={(value) => setPayment((prev) => ({ ...prev, cardFirstName: value }))}
                />
                <InputField
                  label="Cardholder last name"
                  value={payment.cardLastName}
                  onChange={(value) => setPayment((prev) => ({ ...prev, cardLastName: value }))}
                />
              </div>
            </div>

            {error && <p className="rounded-2xl bg-[#FCE1E1] px-4 py-3 text-sm text-[#B4231F]">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#02374D] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#02486A] disabled:opacity-60"
            >
              {submitting ? 'Processing…' : 'Complete booking'}
            </button>
          </form>
          <div className="flex-[1] min-w-0">
            <SummaryPanel summary={summary} primaryCtaLabel="Complete booking" onPrimaryClick={() => {}} hideButton />
          </div>
        </section>
      )}
    </div>
  )
}

function StepIndicator({ current }: { current: number }) {
  const steps = [
    { label: "Choose", id: 1 },
    { label: "Confirm", id: 2 },
    { label: "Pay", id: 3 },
  ]

  const elements = []
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const state = step.id === current ? "current" : step.id < current ? "complete" : "upcoming"

    // Add circle
    elements.push(
      <div key={`circle-${step.id}`} className="flex w-20 flex-col items-center gap-2">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-semibold ${
            state === "complete"
              ? "bg-[#7fcfc2] text-[#F4F1E7]"
              : state === "current"
                ? "bg-[#7fcfc2] text-[#F4F1E7]"
                : "bg-[#DBD8C9] text-[#F4F1E7]"
          }`}
        >
          {step.id}
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-black">{step.label}</span>
      </div>
    )

    // Add line (except after last step)
    if (i < steps.length - 1) {
      elements.push(
        <div key={`line-${step.id}`} className="mx-3 mb-6 h-px w-28 bg-[#DBD8C9]" aria-hidden="true" />
      )
    }
  }

  return (
    <div className="flex items-center justify-center text-sm">
      {elements}
    </div>
  )
}

function SummaryPanel({
  summary,
  primaryCtaLabel,
  onPrimaryClick,
  hideButton = false,
  ctaDisabled = false,
}: {
  summary: Summary
  primaryCtaLabel: string
  onPrimaryClick: () => void
  hideButton?: boolean
  ctaDisabled?: boolean
}) {
  return (
    <div className="sticky top-6 self-start rounded-[28px] border border-[#E8E4D7] bg-[#02374D] p-6 text-white shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
      <div className="text-sm uppercase tracking-[0.2em] text-white/70">Summary</div>
      <div className="mt-4 space-y-1.5 text-sm text-white">
        <p>{summary.venueName}</p>
        <p>{summary.dateDisplay}</p>
        <p>{summary.arrivalTimeLabel}</p>
        <p>{summary.passLabel}</p>
        <p>{summary.partySizeLabel}</p>
        {summary.guestAgeDetails?.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className="mt-5 border-t border-white/20 pt-5 text-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-white/70">Total Price (inc. taxes & fees)</p>
        <p className="mt-2 text-sm text-white">{summary.totalLabel}</p>
        <p className="mt-5 flex items-center justify-between text-white/80">
          <span className="text-xs uppercase tracking-[0.2em]">Due now</span>
          <span className="text-sm text-white">{summary.dueNowLabel}</span>
        </p>
      </div>
      {!hideButton && (
        <button
          type="button"
          onClick={onPrimaryClick}
          disabled={ctaDisabled}
          className="mt-6 w-full rounded-full bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#F4F1E7] disabled:cursor-not-allowed disabled:bg-[#DBD8C9] disabled:text-[#7A7B74]"
        >
          {primaryCtaLabel}
        </button>
      )}
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="text-xs uppercase tracking-[0.2em] text-[#6F716D]">
      {label}
      <input
        className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-black shadow-[inset_0_1px_4px_rgba(0,0,0,0.08)]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}

function BackButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#DBD8C9] text-black transition hover:bg-[#d0ccba]"
      aria-label="Back to pass details"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  )
}

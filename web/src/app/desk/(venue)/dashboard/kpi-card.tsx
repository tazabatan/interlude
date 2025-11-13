import Link from 'next/link'

type KPICardProps = {
  label: string
  value: string | number
  icon?: React.ReactNode
  cta?: {
    label: string
    href: string
  }
  target?: string // For showing targets like "<5m"
}

export function KPICard({ label, value, icon, cta, target }: KPICardProps) {
  return (
    <div className="rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_18px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6F716D]">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold text-[#02374D]">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {target && (
            <p className="mt-2 text-xs text-[#6F716D]">
              Target: {target}
            </p>
          )}
          {cta && (
            <Link
              href={cta.href}
              className="mt-4 inline-block rounded-full bg-[#7fcfc2] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#6ac4b6]"
            >
              {cta.label}
            </Link>
          )}
        </div>
        {icon && (
          <div className="rounded-full bg-[#F4F1E7] p-3 text-[#02374D]">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

// Icon components
export function PendingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function XIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AlertIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9v4M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DollarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function TrendingUpIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 6l-9.5 9.5-5-5L1 18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 6h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

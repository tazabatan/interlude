import Link from 'next/link'

export default function DeviceSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F1E7] px-4 py-10 text-center text-[#02374D]">
      <div className="max-w-md space-y-4 rounded-[32px] bg-white p-6 shadow-[0px_15px_40px_rgba(0,0,0,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Scanner ready</p>
        <h1 className="text-2xl font-semibold">Device registered</h1>
        <p className="text-sm text-[#4F514D]">
          This device is now authorized to scan Interlude passes. Open your camera and scan a guest’s pass to check them in.
        </p>
        <div className="flex flex-col gap-2 text-sm">
          <Link
            href="/desk"
            className="rounded-full bg-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#02486A]"
          >
            Open Desk
          </Link>
          <Link href="/scan" className="text-xs text-[#4F514D] underline-offset-4 hover:underline">
            Scan a test pass
          </Link>
        </div>
      </div>
    </div>
  )
}

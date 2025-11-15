import Link from "next/link"
import Image from "next/image"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-[#E8E4D7] bg-[#EFEDE2] text-black">
      <div className="mx-auto max-w-7xl px-8 py-20 md:px-12 lg:max-w-7xl lg:px-16 xl:px-20 2xl:max-w-[105rem] 2xl:px-24">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1fr_auto_auto]">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <Image
                src="/interlude-logo.png"
                alt="Interlude"
                width={120}
                height={19}
                className="opacity-90"
              />
            </Link>
            <p className="text-xs text-[#6F716D]">
              Secure payments by Stripe. HotelSupplier, a Merchant of Record.
              <br />
              No guest fees. Price parity.
            </p>
          </div>

          {/* Support Section */}
          <div className="md:ml-16 lg:ml-32">
            <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-black">
              Support
            </h3>
            <div className="space-y-3">
              <a
                href="mailto:support@interlude.app"
                className="block text-sm text-black transition hover:text-[#02374D]"
              >
                support@interlude.app
              </a>
              <Link
                href="/support"
                className="inline-flex items-center justify-center rounded-full border border-[#02374D] px-6 py-2 text-xs font-medium text-[#02374D] transition hover:bg-[#02374D] hover:text-white"
              >
                WhatsApp
              </Link>
            </div>
          </div>

          {/* Interlude Links */}
          <div className="md:ml-16 lg:ml-20">
            <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-black">
              Interlude
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-black transition hover:text-[#02374D]"
                >
                  About Interlude
                </Link>
              </li>
              <li>
                <Link
                  href="/venues"
                  className="text-sm text-black transition hover:text-[#02374D]"
                >
                  For Venues
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Links */}
        <div className="mt-16 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-[#E8E4D7] pt-10 text-xs text-[#6F716D]">
          <Link href="/terms" className="transition hover:text-[#02374D]">
            Terms
          </Link>
          <Link href="/privacy" className="transition hover:text-[#02374D]">
            Privacy Policy
          </Link>
          <Link href="/refunds" className="transition hover:text-[#02374D]">
            Refunds & Cancellations
          </Link>
          <Link href="/cookies" className="transition hover:text-[#02374D]">
            Cookies Settings
          </Link>
          <Link href="/accessibility" className="transition hover:text-[#02374D]">
            Accessibility
          </Link>
          <span>&copy; Interlude {currentYear} - company info (uk)</span>
        </div>
      </div>
    </footer>
  )
}

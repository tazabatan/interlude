import type { Metadata } from 'next'
import ProviderForm from './provider-form'

export const metadata: Metadata = {
  title: 'Become an Interlude Provider',
}

export default function ProvidersPage() {
  return (
    <div className="space-y-12 pb-16 text-[#02374D]">
      <header className="space-y-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Partners</p>
        <h1 className="text-3xl font-medium uppercase tracking-[0.02em] text-black">Become an Interlude Provider</h1>
        <p className="mx-auto max-w-3xl text-base leading-relaxed text-black">
          Share your hotel, yacht, or culinary experience with vetted members and guests. Tell us about your property and
          we’ll reach out with next steps.
        </p>
      </header>

      <ProviderForm />
    </div>
  )
}

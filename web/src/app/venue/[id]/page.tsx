import Link from 'next/link'

export default function VenuePage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Venue: {params.id}</h1>
      <p className="text-sm text-gray-600">Pass: Min-Spend (stub)</p>
      <Link className="inline-block rounded bg-black px-4 py-2 text-white" href="/request">
        Request
      </Link>
    </div>
  )
}

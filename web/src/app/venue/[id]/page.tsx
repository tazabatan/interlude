import Link from 'next/link'

export default async function VenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Venue: {id}</h1>
      <p className="text-sm text-gray-600">Pass: Min-Spend (stub)</p>
      <Link className="inline-block rounded bg-black px-4 py-2 text-white" href="/request">
        Request
      </Link>
    </div>
  )
}

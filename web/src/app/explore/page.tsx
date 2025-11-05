import Link from 'next/link'

export default function ExplorePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Explore</h1>
      <p className="text-sm text-gray-600">Members-only browsing. (Stubbed for W2.)</p>
      <ul className="space-y-2">
        <li className="rounded border p-3">
          <div className="font-medium">Test Venue</div>
          <div className="text-sm text-gray-600">Min-Spend Pass</div>
          <Link className="text-blue-600 underline" href="/venue/test">
            View
          </Link>
        </li>
      </ul>
    </div>
  )
}

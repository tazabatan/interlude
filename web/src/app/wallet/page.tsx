import { redirect } from 'next/navigation'

export default function LegacyWalletRedirect() {
  redirect('/app')
}

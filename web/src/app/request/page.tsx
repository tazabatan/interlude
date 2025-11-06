import { redirect } from 'next/navigation'

export default function LegacyRequestRedirect() {
  redirect('/app/request')
}

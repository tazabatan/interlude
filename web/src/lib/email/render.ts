import type { ReactElement } from 'react'
import { render } from '@react-email/render'

export async function renderEmail(component: ReactElement) {
  const html = await render(component)
  const text = await render(component, { plainText: true })
  return { html, text }
}

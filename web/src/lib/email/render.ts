import type { ReactElement } from 'react'
import { render } from '@react-email/render'

export function renderEmail(component: ReactElement) {
  const html = render(component)
  const text = render(component, { plainText: true })
  return { html, text }
}

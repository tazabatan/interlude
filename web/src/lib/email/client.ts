import { Resend } from 'resend'
import type { ReactElement } from 'react'

export type EmailRecipient = {
  email: string
  name?: string | null
}

type RecipientInput = EmailRecipient | string

export type SendEmailParams = {
  to: RecipientInput | RecipientInput[]
  subject: string
  react: ReactElement
  replyTo?: string
  tags?: Array<{ name: string; value: string }>
}

const resendApiKey = process.env.RESEND_API_KEY
const fromAddress = process.env.EMAIL_FROM_ADDRESS
const fromName = process.env.EMAIL_FROM_NAME ?? 'Interlude'
const replyToAddress = process.env.EMAIL_REPLY_TO ?? null
const deliveryDisabled = process.env.EMAIL_DELIVERY_DISABLED === 'true'

let cachedClient: Resend | null = null

function getResendClient() {
  if (!cachedClient) {
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured')
    }
    cachedClient = new Resend(resendApiKey)
  }
  return cachedClient
}

function getFromAddress() {
  if (!fromAddress) {
    throw new Error('EMAIL_FROM_ADDRESS is not configured')
  }
  return fromName ? `${fromName} <${fromAddress}>` : fromAddress
}

export function formatRecipient(recipient: RecipientInput) {
  if (typeof recipient === 'string') return recipient
  if (recipient.name && recipient.name.trim().length > 0) {
    return `${recipient.name.trim()} <${recipient.email}>`
  }
  return recipient.email
}

export async function sendTransactionalEmail(params: SendEmailParams) {
  const toList = Array.isArray(params.to) ? params.to : [params.to]
  if (toList.length === 0) {
    throw new Error('Email recipient list cannot be empty')
  }

  const formattedRecipients = toList.map((entry) => formatRecipient(entry))

  if (deliveryDisabled) {
    console.warn(
      '[email] Delivery disabled. Email not sent:',
      JSON.stringify({
        to: formattedRecipients,
        subject: params.subject,
        tags: params.tags,
      })
    )
    return
  }

  const resend = getResendClient()
  const resolvedReplyTo = params.replyTo ?? replyToAddress ?? undefined
  await resend.emails.send({
    from: getFromAddress(),
    to: formattedRecipients,
    subject: params.subject,
    react: params.react,
    replyTo: resolvedReplyTo,
    tags: params.tags,
  })
}

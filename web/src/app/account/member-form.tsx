"use client"

import { useActionState, useState, useEffect } from "react"
import Image from "next/image"
import { updateMemberProfileAction } from "./actions"
import type { AccountFormState } from "./types"
import { ACCOUNT_FORM_INITIAL_STATE } from "./types"

type MemberAccountFormProps = {
  initialData: {
    fullName: string
    email: string
    phone: string
    dietaryNotes: string
    loungePreferences: string
    contactPreference: string
    cardNickname: string
    cardLast4: string
    avatarPath: string
    avatarImageUrl: string
  }
}

export default function MemberAccountForm({ initialData }: MemberAccountFormProps) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(
    updateMemberProfileAction,
    ACCOUNT_FORM_INITIAL_STATE
  )
  const [previewUrl, setPreviewUrl] = useState(initialData.avatarImageUrl)

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const nextPreview = URL.createObjectURL(file)
      setPreviewUrl(nextPreview)
    }
  }

  return (
    <form action={formAction} className="space-y-8">
      <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-white p-6 shadow-sm">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#02374D]">Profile photo</h2>
            <p className="text-sm text-[#6F716D]">A friendly face helps hosts recognise you on arrival.</p>
          </div>
          <span className="text-xs uppercase tracking-[0.2em] text-[#6F716D]">JPG · PNG · HEIC</span>
        </header>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-[#DBD8C9] bg-[#EEEADF] shadow-[0px_12px_26px_rgba(0,0,0,0.15)]">
            {previewUrl ? (
              <Image src={previewUrl} alt="Profile preview" fill sizes="128px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.3em] text-[#6F716D]">
                Photo
              </div>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <input type="hidden" name="currentAvatarPath" value={initialData.avatarPath} />
            <label className="block text-xs uppercase tracking-[0.2em] text-[#6F716D]">
              Upload new photo
              <input
                type="file"
                accept="image/*"
                name="avatar"
                onChange={handlePhotoChange}
                className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-2 text-sm text-[#02374D]"
              />
            </label>
            <p className="text-xs text-[#6F716D]">We securely store the image and only share it with confirmed venues.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-white p-6 shadow-sm">
        <header>
          <h2 className="text-lg font-semibold text-[#02374D]">Personal information</h2>
          <p className="text-sm text-[#6F716D]">Manage the details we use to personalize your stays.</p>
        </header>
        <label className="block text-xs uppercase tracking-[0.2em] text-[#6F716D]">
          Full name
          <input
            type="text"
            name="fullName"
            defaultValue={initialData.fullName}
            className="mt-2 w-full rounded border border-[#DBD8C9] px-4 py-3 text-sm text-[#02374D]"
          />
        </label>
        <label className="block text-xs uppercase tracking-[0.2em] text-[#6F716D]">
          Email
          <input
            type="email"
            name="email"
            value={initialData.email}
            readOnly
            className="mt-2 w-full rounded border border-dashed border-[#DBD8C9] bg-[#F7F4EA] px-4 py-3 text-sm text-[#6F716D]"
          />
        </label>
        <label className="block text-xs uppercase tracking-[0.2em] text-[#6F716D]">
          Mobile number
          <input
            type="tel"
            name="phone"
            defaultValue={initialData.phone}
            className="mt-2 w-full rounded border border-[#DBD8C9] px-4 py-3 text-sm text-[#02374D]"
          />
        </label>
      </section>

      <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-white p-6 shadow-sm">
        <header>
          <h2 className="text-lg font-semibold text-[#02374D]">Payment method</h2>
          <p className="text-sm text-[#6F716D]">
            Store a preferred card for holds. We only keep a nickname and the last four digits.
          </p>
        </header>
        <label className="block text-xs uppercase tracking-[0.2em] text-[#6F716D]">
          Card nickname
          <input
            type="text"
            name="cardNickname"
            placeholder="Amex Platinum"
            defaultValue={initialData.cardNickname}
            className="mt-2 w-full rounded border border-[#DBD8C9] px-4 py-3 text-sm text-[#02374D]"
          />
        </label>
        <label className="block text-xs uppercase tracking-[0.2em] text-[#6F716D]">
          Card last four digits
          <input
            type="text"
            name="cardLast4"
            maxLength={4}
            placeholder="1234"
            defaultValue={initialData.cardLast4}
            className="mt-2 w-full rounded border border-[#DBD8C9] px-4 py-3 text-sm text-[#02374D]"
          />
        </label>
      </section>

      <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-white p-6 shadow-sm">
        <header>
          <h2 className="text-lg font-semibold text-[#02374D]">Preferences</h2>
          <p className="text-sm text-[#6F716D]">Share anything our hosts should know ahead of your arrival.</p>
        </header>
        <label className="block text-xs uppercase tracking-[0.2em] text-[#6F716D]">
          Dietary requirements
          <textarea
            name="dietaryNotes"
            rows={3}
            defaultValue={initialData.dietaryNotes}
            className="mt-2 w-full rounded border border-[#DBD8C9] px-4 py-3 text-sm text-[#02374D]"
          />
        </label>
        <label className="block text-xs uppercase tracking-[0.2em] text-[#6F716D]">
          Personal preferences
          <textarea
            name="loungePreferences"
            rows={3}
            placeholder="Front row lounger, morning shade, champagne on arrival..."
            defaultValue={initialData.loungePreferences}
            className="mt-2 w-full rounded border border-[#DBD8C9] px-4 py-3 text-sm text-[#02374D]"
          />
        </label>
        <label className="block text-xs uppercase tracking-[0.2em] text-[#6F716D]">
          Contact preference
          <select
            name="contactPreference"
            defaultValue={initialData.contactPreference || "email"}
            className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#02374D]"
          >
            <option value="email">Email</option>
            <option value="phone">Call</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </label>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {state.status !== "idle" && (
          <p
            className={
              state.status === "success"
                ? "text-sm text-green-600"
                : state.status === "error"
                  ? "text-sm text-red-600"
                  : "text-sm text-[#6F716D]"
            }
          >
            {state.message ?? (state.status === "success" ? "Saved" : "Something went wrong")}
          </p>
        )}
        <button
          type="submit"
          className="self-end rounded-full border border-[#02374D] px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white"
        >
          Save changes
        </button>
      </div>
    </form>
  )
}

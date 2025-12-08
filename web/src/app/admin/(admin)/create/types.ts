export const DAY_CONFIG = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
] as const

export type DayKey = (typeof DAY_CONFIG)[number]["key"]

export type OpeningHours = {
  enabled: boolean
  opensAt: string
  closesAt: string
}

export type BlackoutRange = {
  id: string
  startDate: string
  endDate: string
  note: string
}

export type VenueStatus = "draft" | "active" | "paused"

export type ImageAsset = {
  id: string
  name: string
  url: string
  storagePath?: string | null
  file?: File | null
  focalX?: number | null
  focalY?: number | null
  zoom?: number | null
}

export type VenueFormState = {
  heroImage: ImageAsset | null
  galleryImages: ImageAsset[]
  displayName: string
  internalName: string
  shortDescription: string
  status: VenueStatus
  providerType: 'hotel' | 'restaurant' | 'private_chef' | 'boat_company'
  address: {
    street: string
    city: string
    region: string
    country: string
    postcode: string
  }
  timezone: string
  primaryContact: {
    name: string
    email: string
  }
  inviteManager: {
    name: string
    email: string
  }
  website: string
  termsLink: string
  privacyLink: string
  stripeAccountId: string
  currency: string
  taxJurisdiction: string
  taxPercentage: string
  taxBehavior: "included" | "excluded"
  revenueShare: {
    interludePercent: string
    minimumUsd: string
  }
  openingHours: Record<DayKey, OpeningHours>
  blackouts: BlackoutRange[]
}

export type PassEconomicsType = "min_spend" | "prepaid_credit"

export type PassVisibility = "members" | "guest_only" | "both"

export type PassFormState = {
  status: "draft" | "active" | "paused"
  name: string
  kind: "BEACH_PASS" | "POOL_PASS" | "GYM_PASS" | "SPA_PASS" | "BOAT_DAY" | "PRIVATE_CHEF"
  shortDescription: string
  interludePerk: string
  economicsType: PassEconomicsType
  minSpendAmount: string
  prepaidCreditAmount: string
  currency: string
  displayPriceText: string
  heroImage: ImageAsset | null
  autoApprove: boolean
  serviceOpen: string
  serviceClose: string
  arrivalStart: string
  arrivalDuration: string
  visibility: PassVisibility
  defaultDailyCap: string
  graceMinutes: string
  noShowHoldAmount: string
  cancellationWindowDays: string
  cancellationWindowTime: string
}

export type PassRecord = {
  id: string
  venueId: string
  createdAt: string
  updatedAt: string
  status: "draft" | "active" | "paused"
  name: string
  kind: PassFormState["kind"]
  shortDescription: string
  interludePerk: string
  economicsType: PassEconomicsType
  minSpendAmountCents: number | null
  prepaidCreditCents: number | null
  currency: string
  displayPriceText: string
  heroImage: ImageAsset | null
  autoApprove: boolean
  serviceOpen: string
  serviceClose: string
  arrivalStart: string
  arrivalDurationMinutes: number
  visibility: PassVisibility
  defaultDailyCap: number
  graceMinutes: number
  noShowHoldAmountCents: number | null
  cancellationWindowDays: number
  cancellationWindowTime: string
}

export type VenueRecord = VenueFormState & {
  id: string
  createdAt: string
  passes: PassRecord[]
}

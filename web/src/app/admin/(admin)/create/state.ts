import { DAY_CONFIG, DayKey, OpeningHours, VenueFormState, PassFormState } from "./types"

export const buildDefaultOpeningHours = (): Record<DayKey, OpeningHours> => {
  return DAY_CONFIG.reduce((acc, day) => {
    acc[day.key] = {
      enabled: day.key !== "sunday",
      opensAt: "09:00",
      closesAt: "18:00",
    }
    return acc
  }, {} as Record<DayKey, OpeningHours>)
}

export const createEmptyVenueFormState = (): VenueFormState => ({
  heroImage: null,
  galleryImages: [],
  displayName: "",
  internalName: "",
  shortDescription: "",
  status: "draft",
  address: {
    street: "",
    city: "",
    region: "",
    country: "",
    postcode: "",
  },
  timezone: "America/Anguilla",
  primaryContact: {
    name: "",
    email: "",
  },
  inviteManager: {
    name: "",
    email: "",
  },
  website: "",
  termsLink: "",
  privacyLink: "",
  stripeAccountId: "",
  currency: "USD",
  taxJurisdiction: "",
  taxPercentage: "15",
  taxBehavior: "included",
  revenueShare: {
    interludePercent: "10",
    minimumUsd: "4",
  },
  openingHours: buildDefaultOpeningHours(),
  blackouts: [],
})

export const createEmptyPassFormState = (defaultCurrency = "USD"): PassFormState => ({
  status: "draft",
  name: "",
  kind: "BEACH_PASS",
  shortDescription: "",
  economicsType: "min_spend",
  minSpendAmount: "150",
  prepaidCreditAmount: "0",
  currency: defaultCurrency || "USD",
  displayPriceText: "",
  heroImage: null,
  autoApprove: true,
  serviceOpen: "09:00",
  serviceClose: "18:00",
  arrivalStart: "10:00",
  arrivalDuration: "120",
  visibility: "members",
  defaultDailyCap: "10",
  graceMinutes: "30",
  noShowHoldAmount: "0",
  cancellationWindowDays: "2",
  cancellationWindowTime: "12:00",
})

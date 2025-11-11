export type AccountFormState = {
  status: "idle" | "success" | "error"
  message?: string
}

export const ACCOUNT_FORM_INITIAL_STATE: AccountFormState = { status: "idle" }

export type InviteFormState = {
  status: "idle" | "success" | "error"
  message: string
}

export const initialInviteFormState: InviteFormState = {
  status: "idle",
  message: "",
}


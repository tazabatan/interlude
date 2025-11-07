import { fetchDeskBookings } from '@/lib/desk'
import { autoApproveAction, dailyCapAction, pauseAction } from '../actions'

type PassControl = {
  passId: string
  name: string
  tz: string
  autoApprove: boolean
  defaultStart: string
  defaultMinutes: number
}

function formatPassControls(passRows: Awaited<ReturnType<typeof fetchDeskBookings>>[]) {
  const map = new Map<string, PassControl>()
  passRows.flat().forEach((booking) => {
    if (booking.pass && !map.has(booking.pass_id)) {
      map.set(booking.pass_id, {
        passId: booking.pass_id,
        name: booking.pass.venue?.name ?? booking.pass.kind ?? booking.pass_id,
        tz: booking.pass.venue?.tz ?? 'UTC',
        autoApprove: booking.pass.auto_approve_enabled,
        defaultStart: booking.pass.default_arrival_start_local ?? '12:00',
        defaultMinutes: booking.pass.default_arrival_window_minutes ?? 60,
      })
    }
  })
  return Array.from(map.values())
}

export default async function DeskPassesPage() {
  const data = await Promise.all([fetchDeskBookings('requested'), fetchDeskBookings('pending_verification')])
  const passControls = formatPassControls(data)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-8 text-[#02374D]">
      <header className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-[#6F716D]">Venue Desk</p>
        <h1 className="text-3xl font-semibold uppercase tracking-[0.02em] text-black">Passes</h1>
        <p className="text-sm text-[#4F514D]">Manage auto-approve, caps, and pause states per pass.</p>
      </header>

      {passControls.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#DBD8C9] bg-white/70 px-12 py-16 text-center text-sm text-[#4F514D]">
          Pass controls will appear once bookings exist for this venue.
        </div>
      ) : (
        <ControlsSection controls={passControls} today={today} />
      )}
    </div>
  )
}

function ControlsSection({ controls, today }: { controls: PassControl[]; today: string }) {
  return (
    <section className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold uppercase tracking-[0.1em]">Pass controls</h2>
        <p className="text-sm text-[#4F514D]">
          Tune availability, caps, and auto-approve settings for each pass without leaving the desk.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {controls.map((control) => (
          <div
            key={control.passId}
            className="flex h-full flex-col rounded-[28px] border border-[#E8E4D7] bg-white px-6 py-6 shadow-[0px_4px_20px_rgba(0,0,0,0.1)]"
          >
            <div className="space-y-1 text-sm">
              <div className="text-lg font-semibold uppercase tracking-[0.08em] text-black">{control.name}</div>
              <div className="text-[#6F716D]">Timezone · {control.tz}</div>
              <div className="text-[#6F716D]">
                Default window · {control.defaultStart} · {control.defaultMinutes} min
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm">
              <form action={autoApproveAction} className="flex items-center justify-between rounded-full border border-[#DBD8C9] bg-[#F9F6ED] px-4 py-2">
                <input type="hidden" name="passId" value={control.passId} />
                <span className="uppercase tracking-[0.25em] text-[#6F716D]">Auto-approve</span>
                <div className="flex gap-2">
                  <button
                    name="enabled"
                    value="true"
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      control.autoApprove ? 'bg-[#02374D] text-white' : 'bg-[#DBD8C9] text-[#02374D]'
                    }`}
                  >
                    On
                  </button>
                  <button
                    name="enabled"
                    value="false"
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      !control.autoApprove ? 'bg-[#02374D] text-white' : 'bg-[#DBD8C9] text-[#02374D]'
                    }`}
                  >
                    Off
                  </button>
                </div>
              </form>

              <form action={dailyCapAction} className="space-y-2 rounded-[20px] border border-[#E8E4D7] bg-[#F9F6ED] p-4 text-xs uppercase tracking-[0.25em] text-[#6F716D]">
                <input type="hidden" name="passId" value={control.passId} />
                <input type="hidden" name="date" value={today} />
                <label className="space-y-1">
                  <span>Daily cap</span>
                  <input
                    name="cap"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="20"
                    className="w-full rounded border border-[#DBD8C9] px-3 py-2 text-sm text-gray-700"
                  />
                </label>
                <button className="w-full rounded-full border border-[#02374D] px-4 py-2 text-sm font-medium text-[#02374D] transition hover:bg-[#02374D] hover:text-white">
                  Save cap
                </button>
              </form>

              <div className="space-y-2 text-xs uppercase tracking-[0.25em] text-[#6F716D]">
                <form action={pauseAction}>
                  <input type="hidden" name="passId" value={control.passId} />
                  <input type="hidden" name="date" value={today} />
                  <input type="hidden" name="paused" value="true" />
                  <button className="w-full rounded-full border border-[#B4231F] px-4 py-2 text-sm font-medium text-[#B4231F] transition hover:bg-[#F5B8B8]/30">
                    Pause today
                  </button>
                </form>
                <form action={pauseAction}>
                  <input type="hidden" name="passId" value={control.passId} />
                  <input type="hidden" name="date" value={today} />
                  <input type="hidden" name="paused" value="false" />
                  <button className="w-full rounded-full border border-[#02374D] px-4 py-2 text-sm font-medium text-[#02374D] transition hover:bg-[#02374D] hover:text-white">
                    Resume today
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

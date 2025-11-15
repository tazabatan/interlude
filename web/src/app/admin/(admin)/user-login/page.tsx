import UserImpersonationForm from './user-impersonation-form'
import RecentImpersonationSessions from './recent-impersonation-sessions'

export default function UserLoginPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-[#02374D]">User Login</h1>
        <p className="text-sm text-gray-600">
          Impersonate a user to see their experience and troubleshoot issues. All actions during the session will be
          logged.
        </p>
      </header>

      <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-white p-6 shadow-[0px_4px_18px_rgba(0,0,0,0.08)]">
        <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-[#6F716D]">Start impersonation session</h2>
        <p className="text-sm text-[#4F514D]">
          Enter the email address of the user you want to impersonate and set a time limit for the session. You'll be
          logged in as that user and can see what they see.
        </p>
        <UserImpersonationForm />
      </section>

      <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-white p-6 shadow-[0px_4px_18px_rgba(0,0,0,0.08)]">
        <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-[#6F716D]">Recent Sessions</h2>
        <p className="text-sm text-[#4F514D]">
          View and download reports for recent impersonation sessions.
        </p>
        <RecentImpersonationSessions />
      </section>
    </div>
  )
}

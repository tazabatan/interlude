function createServerClient(_url, _key, ctx) {
  const mock = globalThis.__supabaseMock ?? {}

  return {
    auth: {
      async getUser() {
        if (typeof mock.getUser === 'function') {
          return mock.getUser(ctx)
        }

        if (Array.isArray(mock.setCookies)) {
          for (const cookie of mock.setCookies) {
            ctx.cookies.set(cookie.name, cookie.value, cookie.options ?? {})
          }
        }

        return mock.response ?? { data: { user: null } }
      },
    },
  }
}

module.exports = {
  createServerClient,
}

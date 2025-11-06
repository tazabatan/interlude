function createCookieStore() {
  const store = new Map()
  return {
    get(name) {
      const value = store.get(name)
      return value ? { name, value } : undefined
    },
    getAll() {
      return Array.from(store.entries()).map(([name, value]) => ({ name, value }))
    },
    set({ name, value }) {
      store.set(name, value)
    },
  }
}

function cookies() {
  return createCookieStore()
}

function headers() {
  return new Map()
}

module.exports = {
  cookies,
  headers,
}

class CookieJar {
  constructor() {
    this.store = new Map()
  }

  set(nameOrCookie, value, options = {}) {
    if (typeof nameOrCookie === 'string') {
      const cookie = { name: nameOrCookie, value, ...options }
      this.store.set(nameOrCookie, cookie)
      return
    }

    const { name, value: cookieValue, ...rest } = nameOrCookie
    this.store.set(name, { name, value: cookieValue, ...rest })
  }

  get(name) {
    const cookie = this.store.get(name)
    return cookie ? { value: cookie.value } : undefined
  }

  getAll() {
    return Array.from(this.store.values())
  }
}

class FakeNextResponse {
  constructor(type, url = null) {
    this.type = type
    this.url = url
    this.cookies = new CookieJar()
  }

  static next() {
    return new FakeNextResponse('next')
  }

  static redirect(url) {
    return new FakeNextResponse('redirect', typeof url === 'string' ? url : url.toString())
  }
}

module.exports = {
  NextResponse: FakeNextResponse,
}

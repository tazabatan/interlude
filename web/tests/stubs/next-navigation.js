function redirect(url) {
  const error = new Error(`Redirect to ${url}`)
  error.url = url
  error.code = 'NEXT_REDIRECT'
  throw error
}

module.exports = {
  redirect,
}

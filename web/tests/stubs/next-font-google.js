function fontFactory() {
  return () => ({
    className: 'stub-font',
  })
}

module.exports = {
  Inter: fontFactory(),
  Montserrat: fontFactory(),
}

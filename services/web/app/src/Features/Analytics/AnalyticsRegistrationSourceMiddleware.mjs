function middleware() {
  return (_req, _res, next) => next()
}

export default {
  setSource: middleware,
  clearSource: middleware,
  setInbound: middleware,
}

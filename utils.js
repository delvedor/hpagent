function getProxy () {
  const {
    http_proxy: httpProxy,
    https_proxy: httpsProxy,
    HTTP_PROXY,
    HTTPS_PROXY
  } = process.env
  return httpsProxy || HTTPS_PROXY || httpProxy || HTTP_PROXY
}

function requestShouldUseProxy (options, exceptions) {
  if (exceptions.length === 0) {
    return true
  }

  const shouldProxy = !exceptions.some(exception => {
    const host = options.host || ''
    const port = options.port || ''

    return exception.test(`${host}${port ? `:${port}` : ''}`)
  })

  return shouldProxy
}

function generateExceptions (noProxy) {
  const exceptions = typeof noProxy === 'string'
    ? noProxy
        .split(',')
        .map(exception => exception.trim())
        .filter(exception => exception)
        .map(exception => {
          const endsWithWildcard = exception.endsWith('*')
          const startsWithWildcard = exception.startsWith('*')

          let regexp
          if (endsWithWildcard && !startsWithWildcard) {
            regexp = new RegExp(`^${exception.substring(0, exception.length - 1)}`)
          } else if (!endsWithWildcard && startsWithWildcard) {
            regexp = new RegExp(`${exception.substring(1)}$`)
          } else if (endsWithWildcard && startsWithWildcard) {
            const withoutEndWildcard = exception.substring(0, exception.length - 1)
            const withoutWildcards = withoutEndWildcard.substring(1)

            regexp = new RegExp(`/*${withoutWildcards}/*`)
          } else if (exception === '*') {
            regexp = /(.*)/
          } else {
            regexp = new RegExp(exception)
          }

          return regexp
        })
    : []

  return (options) => requestShouldUseProxy(options, exceptions)
}

module.exports = {
  getProxy,
  generateExceptions
}

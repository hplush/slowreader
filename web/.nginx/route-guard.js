// Code in this file is in NJS language https://nginx.org/en/docs/njs/

// eslint-disable-next-line
import rawRegExps from '/etc/nginx/njs/routes.js'

const ROUTE_REGEXPS = rawRegExps.map(
  route => new RegExp(route.source, route.flags)
)

/**
 * Return 404 status if requested path is not supported by application.
 * @param r - Nginx HTTP Request https://nginx.org/en/docs/njs/reference.html#http
 */
async function check(r) {
  r.headersOut['Content-Type'] = 'text/html'

  let requestPath = r.uri.split('?')[0]
  let routeExists = ROUTE_REGEXPS.find(route => route.test(requestPath))

  let appIndex = await r.subrequest('/index.html', r.variables.args)

  if (routeExists) {
    return r.return(200, appIndex.responseText)
  } else {
    return r.return(404, appIndex.responseText)
  }
}

export default { check }

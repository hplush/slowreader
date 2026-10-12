resource "scaleway_domain_record" "caa" {
  for_each = toset([
    "0 issue \"letsencrypt.org\"",
    "0 issuewild \";\"",
    "0 iodef \"mailto:andrey@sitnik.es\""
  ])
  dns_zone = "slowreader.app"
  name     = ""
  type     = "CAA"
  data     = each.value
}

resource "scaleway_domain_record" "app" {
  dns_zone = "slowreader.app"
  name     = ""
  type     = "ALIAS"
  data     = "${trimprefix(scaleway_container.app.public_endpoint, "https://")}."
}

# Serverless Containers have no HTTP/3
resource "scaleway_domain_record" "app_https" {
  dns_zone = "slowreader.app"
  name     = ""
  type     = "HTTPS"
  data     = "1 . alpn=h2"
}

resource "scaleway_domain_record" "proxy" {
  dns_zone = "slowreader.app"
  name     = "proxy"
  type     = "CNAME"
  data     = "${trimprefix(scaleway_container.proxy.public_endpoint, "https://")}."
}

# Staging stays on our own cloud
resource "scaleway_domain_record" "staging_ipv4" {
  dns_zone = "slowreader.app"
  name     = "dev"
  type     = "A"
  data     = "91.98.155.169"
}

resource "scaleway_domain_record" "staging_ipv6" {
  dns_zone = "slowreader.app"
  name     = "dev"
  type     = "AAAA"
  data     = "2a01:4f8:c012:2e6f::1"
}

resource "scaleway_domain_record" "staging_https" {
  dns_zone = "slowreader.app"
  name     = "dev"
  type     = "HTTPS"
  data     = "1 . alpn=h3,h2"
}

resource "scaleway_domain_record" "staging_proxy" {
  dns_zone = "slowreader.app"
  name     = "proxy.dev"
  type     = "CNAME"
  data     = "dev.slowreader.app."
}

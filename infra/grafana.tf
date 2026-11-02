# Our Grafana on dashboard.hplush.dev reads app’s analytics API
# and Cockpit metrics

# Goes to HTTP header without escaping
resource "random_password" "analytics" {
  length  = 48
  special = false
}

resource "scaleway_cockpit_token" "grafana" {
  name = "hplush-grafana"
  scopes {
    query_metrics = true
    # Provider enables writes by default
    write_metrics = false
    write_logs    = false
  }
}

data "scaleway_cockpit_source" "metrics" {
  type   = "metrics"
  origin = "scaleway"
}

output "analytics_token" {
  value     = random_password.analytics.result
  sensitive = true
}

output "cockpit_token" {
  value     = scaleway_cockpit_token.grafana.secret_key
  sensitive = true
}

output "cockpit_metrics_url" {
  value = data.scaleway_cockpit_source.metrics.url
}

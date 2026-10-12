resource "scaleway_container_namespace" "main" {
  name = "slowreader"
}

resource "scaleway_container" "app" {
  name         = "app"
  namespace_id = scaleway_container_namespace.main.id
  image        = "ghcr.io/hplush/slowreader:dev"
  port         = 2553

  cpu_limit          = 560
  memory_limit_bytes = 1073741824
  # Logux keeps clients and subscriptions in memory
  min_scale = 1
  max_scale = 1
  # WebSocket lives until the request timeout, then Logux client reconnects
  timeout = 3600

  privacy                = "public"
  protocol               = "http1"
  https_connections_only = true
  private_network_id     = scaleway_vpc_private_network.main.id

  environment_variables = {
    ROLE            = "app"
    BEHIND_BALANCER = "1"
    WEB_ORIGIN      = "https://slowreader.app"
  }
  secret_environment_variables = {
    DATABASE_URL = format(
      "postgres://%s:%s@%s:%d/%s?sslmode=require",
      scaleway_rdb_user.app.name,
      random_password.database_app.result,
      scaleway_rdb_instance.main.private_network[0].ip,
      scaleway_rdb_instance.main.private_network[0].port,
      scaleway_rdb_database.main.name
    )
  }

  # /health waits for the server, which applies migrations on start
  startup_probe {
    http {
      path = "/health"
    }
    failure_threshold = 50
    interval          = "6s"
    timeout           = "3s"
  }
  liveness_probe {
    http {
      path = "/health"
    }
    failure_threshold = 3
    interval          = "10s"
    timeout           = "3s"
  }

  lifecycle {
    // Allow to change image from API without changing config
    ignore_changes = [image]
  }
}

resource "scaleway_container" "proxy" {
  name         = "proxy"
  namespace_id = scaleway_container_namespace.main.id
  image        = "ghcr.io/hplush/slowreader:dev"
  port         = 2553

  cpu_limit          = 560
  memory_limit_bytes = 1073741824
  min_scale          = 0
  max_scale          = 2

  privacy                = "public"
  protocol               = "http1"
  https_connections_only = true

  environment_variables = {
    ROLE            = "proxy"
    BEHIND_BALANCER = "1"
    PROXY_ORIGIN    = "^https:\\/\\/slowreader\\.app$"
  }

  liveness_probe {
    http {
      path = "/health"
    }
    failure_threshold = 3
    interval          = "10s"
    timeout           = "3s"
  }

  lifecycle {
    // Allow to change image from API without changing config
    ignore_changes = [image]
  }
}

resource "scaleway_container_domain" "app" {
  container_id = scaleway_container.app.id
  hostname     = "slowreader.app"
  depends_on   = [scaleway_domain_record.app]
}

resource "scaleway_container_domain" "proxy" {
  container_id = scaleway_container.proxy.id
  hostname     = "proxy.slowreader.app"
  depends_on   = [scaleway_domain_record.proxy]
}

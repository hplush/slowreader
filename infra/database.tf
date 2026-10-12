ephemeral "random_password" "database_admin" {
  length = 40
}

resource "random_password" "database_app" {
  length      = 40
  min_upper   = 1
  min_lower   = 1
  min_numeric = 1
  min_special = 1
  # Password goes to DATABASE_URL without escaping
  override_special = "-_.~"
}

resource "scaleway_rdb_instance" "main" {
  name               = "slowreader"
  node_type          = "DB-PLAY2-PICO"
  engine             = "PostgreSQL-17"
  is_ha_cluster      = false
  volume_type        = "sbs_5k"
  volume_size_in_gb  = 10
  encryption_at_rest = true

  user_name           = "slowreader_admin"
  password_wo         = ephemeral.random_password.database_admin.result
  password_wo_version = 1

  backup_schedule_frequency = 24
  backup_schedule_retention = 7
  backup_same_region        = false

  private_network {
    pn_id       = scaleway_vpc_private_network.main.id
    enable_ipam = true
  }
}

resource "scaleway_rdb_database" "main" {
  instance_id = scaleway_rdb_instance.main.id
  name        = "slowreader"
}

resource "scaleway_rdb_user" "app" {
  instance_id = scaleway_rdb_instance.main.id
  name        = "slowreader"
  password    = random_password.database_app.result
  is_admin    = false
}

resource "scaleway_rdb_privilege" "app" {
  instance_id   = scaleway_rdb_instance.main.id
  user_name     = scaleway_rdb_user.app.name
  database_name = scaleway_rdb_database.main.name
  permission    = "all"
}

terraform {
  required_version = ">= 1.11.0"

  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "2.89.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.9.1"
    }
  }

  backend "s3" {
    bucket = "slowreader-tofu-state"
    key    = "slowreader.tfstate"
    region = "fr-par"
    endpoints = {
      s3 = "https://s3.fr-par.scw.cloud"
    }
    use_lockfile                = true
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
  }

  # State keeps the database password and DATABASE_URL
  encryption {
    key_provider "pbkdf2" "passphrase" {
      passphrase = var.state_passphrase
    }
    method "aes_gcm" "passphrase" {
      keys = key_provider.pbkdf2.passphrase
    }
    state {
      method   = method.aes_gcm.passphrase
      enforced = true
    }
    plan {
      method   = method.aes_gcm.passphrase
      enforced = true
    }
  }
}

provider "scaleway" {
  organization_id = "27be80ca-452a-4be0-a1db-6ea024958a93"
  project_id      = "27be80ca-452a-4be0-a1db-6ea024958a93"
  region          = "fr-par"
  # Managed Database can join Private Network only in the default zone
  zone = "fr-par-1"
}

variable "state_passphrase" {
  type      = string
  sensitive = true
}

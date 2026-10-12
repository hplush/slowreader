# Slow Reader Infrastructure

[OpenTofu](https://opentofu.org) config for production on Scaleway: app and proxy in Serverless Containers, Managed PostgreSQL in a Private Network, and the `slowreader.app` DNS zone.

## Files

- [`versions.tf`](./versions.tf): OpenTofu and providers versions, state storage, and state encryption.
- [`network.tf`](./network.tf): Private Network between the app and the database.
- [`database.tf`](./database.tf): PostgreSQL instance, database, and the app’s user.
- [`containers.tf`](./containers.tf): app and proxy containers, and their domains.
- [`dns.tf`](./dns.tf): all records of `slowreader.app`.
- [`.terraform.lock.hcl`](./.terraform.lock.hcl): providers checksums. Run `pnpm update-infra` to update providers.
- [`tofu.sh`](./tofu.sh): runs OpenTofu with Scaleway keys and the state passphrase after `tofu init`.

## Apply Changes

We keep Scaleway keys only in the memory of OpenTofu process.

1. Create an API key in Scaleway console:
   1. Open **IAM & API keys** in the Organization drop-down menu at the top right.
   2. Open **API keys** tab and click **+ Generate API key**.
   3. Select `tofu` IAM application as the bearer.
   4. Set **1 hour** expiration.
   5. Select **Yes, set up preferred Project** and choose `Slow Reader` for Object Storage.
   6. Click **Generate API key** and keep the window open until OpenTofu asks the keys.
2. Stop dev servers and tests, since a malicious dependency can read the keys from OpenTofu process.
3. Run `./infra/tofu.sh apply` instead of `tofu apply`. It asks the keys and the state passphrase, shows the plan, and waits for `yes`.
4. Delete the API key after the work.

## Manual Setup

Steps, which OpenTofu can’t do. You need them only once.

### Account

1. Add a hardware key as the second factor in [Account Security](https://console.scaleway.com/settings/account/security).
2. Create `Slow Reader` project in **Projects** tab of [Organization Dashboard](https://console.scaleway.com/organization).
3. Copy the Project ID from the Project’s **Settings** and the Organization ID by **Copy ID** in Organization Settings to `project_id` and `organization_id` of `provider "scaleway"` in [`versions.tf`](./versions.tf).
4. Create `tofu` IAM application:
   1. Open **IAM & API keys** in the Organization drop-down menu at the top right.
   2. Open **Applications** tab and click **Create application**.
   3. Enter `tofu` name, don’t attach any policy, and click **Create application**.
5. Create a policy for `tofu` application:
   1. In **IAM & API keys** open **Policies** tab and click **Create policy**.
   2. Enter `tofu` name and select `tofu` application as the principal.
   3. In **Resource management** tick permission sets and click **Next**:
      - **Serverless Containers** → `ContainersFullAccess`.
      - **PostgreSQL & MySQL** → `RelationalDatabasesFullAccess`.
      - **VPC** → `VPCFullAccess` and `PrivateNetworksFullAccess`.
      - **IPAM** → `IPAMFullAccess`.
      - **Domains & DNS** → `DomainsDNSFullAccess`.
      - **Object Storage** → `ObjectStorageFullAccess`.
   4. Select **Specific projects**, choose `Slow Reader`, and click **Next**.
   5. Skip conditions, click **Confirm rule**, and **Create policy**.
6. Create a bucket for the Tofu state:
   1. Open **Create** → **Object Storage Bucket**.
   2. Select `Paris` (`fr-par`) region and enter `slowreader-tofu-state` name.
   3. Select **Private** visibility.
   4. Tick **Enable bucket versioning** to restore a broken state.
   5. Click **Create bucket**.
7. Add `slowreader.app` as an external domain:
   1. Open **Domains & DNS** in the side menu.
   2. Click **+ Search domain name**, enter `slowreader.app`, and click the search icon.
   3. Click **Manage as external** in **Exact match** and **Manage as external** again to confirm.
8. Create an API key as we tell in `Apply Changes` section above.
9. Generate a passphrase with at least 16 symbols and save it in a password manager. State is encrypted by it, and we can’t read the state without it.

Apply initial status:

```sh
./infra/tofu.sh apply
```

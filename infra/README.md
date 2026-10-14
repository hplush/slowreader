# Slow Reader Infrastructure

[OpenTofu](https://opentofu.org) config for production on Scaleway: app and proxy in Serverless Containers, Managed PostgreSQL in a Private Network, and the `slowreader.app` DNS zone.

## Files

- [`versions.tf`](./versions.tf): OpenTofu and providers versions, state storage, and state encryption.
- [`network.tf`](./network.tf): Private Network between the app and the database.
- [`database.tf`](./database.tf): PostgreSQL instance, database, and the app’s user.
- [`containers.tf`](./containers.tf): app and proxy containers, and their domains.
- [`dns.tf`](./dns.tf): all records of `slowreader.app`.
- [`.terraform.lock.hcl`](./.terraform.lock.hcl): providers checksums. Run `pnpm update-infra` to update providers.
- [`scripts/tofu.sh`](./scripts/tofu.sh): runs OpenTofu with Scaleway keys and the state passphrase after `tofu init`.

## Apply Changes

We keep Scaleway keys only in the memory of OpenTofu process.

1. Create an API key in Scaleway console:
   1. Open [**API keys**](https://console.scaleway.com/iam/api-keys) in **IAM & API keys** and click **+ Generate API key**.
   2. Select `tofu` IAM application as the bearer.
   3. Set **1 hour** expiration.
   4. Select **Yes, set up preferred Project** and choose `Slow Reader` for Object Storage.
   5. Click **Generate API key** and keep the window open until OpenTofu asks the keys.
2. Stop dev servers and tests, since a malicious dependency can read the keys from OpenTofu process.
3. Run `./infra/scripts/tofu.sh apply` instead of `tofu apply`. It asks the keys and the state passphrase, shows the plan, and waits for `yes`.
4. Delete the API key after the work.

## Manual Setup

Steps, which OpenTofu can’t do. You need them only once.

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
6. Create `deploy` IAM application for `scripts/release.sh`:
   1. In **IAM & API keys** open **Applications** tab and click **Create application**.
   2. Enter `deploy` name and click **Create application**.
   3. Open **Policies** tab, click **Create policy**, enter `deploy` name, and select `deploy` application as the principal.
   4. In **Resource management** tick **Serverless Containers** → `ContainersFullAccess` and click **Next**.
   5. Select **Specific projects**, choose `Slow Reader`, click **Next**, **Confirm rule**, and **Create policy**.
7. Create a bucket for the Tofu state:
   1. Open **Create** → **Object Storage Bucket**.
   2. Select `Paris` (`fr-par`) region and enter `slowreader-tofu-state` name.
   3. Select **Private** visibility.
   4. Tick **Enable bucket versioning** to restore a broken state.
   5. Click **Create bucket**.
8. Add `slowreader.app` as an external domain:
   1. Open **Domains & DNS** in the side menu.
   2. Click **+ Search domain name**, enter `slowreader.app`, and click the search icon.
   3. Click **Manage as external** in **Exact match** and **Manage as external** again to confirm.
9. Create an API key as we tell in `Apply Changes` section above.
10. Generate a passphrase with at least 16 symbols and save it in a password manager. State is encrypted by it, and we can’t read the state without it.

Apply initial status:

```sh
./infra/scripts/tofu.sh apply
```

Enable DNSSEC:

1. Sign the zone and copy `ds_records` from the output:

   ```sh
   curl -X POST https://api.scaleway.com/domain/v2beta1/domains/slowreader.app/enable-dnssec \
     -H "X-Auth-Token: $SCW_SECRET_KEY" -H 'Content-Type: application/json' -d '{}'
   ```

2. Wait until `dig +short DNSKEY slowreader.app @ns0.dom.scw.cloud` returns keys.
3. Open the domain in register, go to DNSSEC settings and add a DS record: `key_id` as key tag, `algorithm` (`13` for `ecdsap256sha256`), `digest.type` (`2` for `sha_256`), and `digest.digest`.

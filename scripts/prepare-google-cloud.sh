#!/bin/bash
# Configures Google Cloud project for Slow Reader deployment.
# Google Cloud settings can be complex. We have this file to not forget them.
# Do not change Google Cloud by web. Always use `gcloud` and update this script.

PROJECT_ID=test-418219
REGION=europe-west6
WORKFLOWS=(
  ".github/workflows/staging.yml"
  ".github/workflows/preview-close.yml"
  ".github/workflows/preview-deploy.yml"
)

# Set project as default in CLI
gcloud init --project=$PROJECT_ID

# Create deploy account
gcloud services enable iamcredentials.googleapis.com --project=$PROJECT_ID
gcloud iam service-accounts create "github-deploy" --project=$PROJECT_ID
ACCOUNT_EMAIL="github-deploy@$PROJECT_ID.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$ACCOUNT_EMAIL" \
    --role="roles/iam.serviceAccountUser"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$ACCOUNT_EMAIL" \
    --role="roles/run.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$ACCOUNT_EMAIL" \
    --role="roles/artifactregistry.admin"

# Create repository for Docker images
gcloud services enable artifactregistry.googleapis.com --project=$PROJECT_ID
gcloud artifacts repositories create staging \
    --project=$PROJECT_ID \
    --repository-format=docker \
    --location=${REGION}

# Allow safer access to the service account from GitHub Actions
gcloud iam workload-identity-pools create "github" \
  --project=$PROJECT_ID \
  --location="global" \
  --display-name="GitHub Actions Pool"
gcloud iam workload-identity-pools providers create-oidc "slowreader" \
  --project=$PROJECT_ID \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="GitHub Slow Reader Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == 'hplush'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Bind the deploy account to that saver access
WORKLOAD_IDENTITY_POOL_ID=`gcloud iam workload-identity-pools describe "github" \
  --project=$PROJECT_ID \
  --location="global" \
  --format="value(name)"`
gcloud iam service-accounts add-iam-policy-binding "$ACCOUNT_EMAIL" \
  --project=$PROJECT_ID \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/hplush/slowreader"

# Enable Google Cloud Run
gcloud services enable run.googleapis.com --project=$PROJECT_ID

# Use workload_identity_provider in workflows
IDENTITY=`gcloud iam workload-identity-pools providers describe "slowreader" \
  --project=$PROJECT_ID \
  --location="global" \
  --workload-identity-pool="github" \
  --format="value(name)"`
for file in "${WORKFLOWS[@]}"; do
  sed -i "s|identity_provider: .*|identity_provider: $IDENTITY|" "$file"
  sed -i "s/PROJECT_ID: .*/PROJECT_ID: $PROJECT_ID/" "$file"
  sed -i "s/REGION: .*/REGION: $REGION/" "$file"
done

echo ""
echo "\033[0;33m\033[1mAfter first deploy:\033[0m"
echo ""
echo "1. Open https://console.cloud.google.com/run"
echo "2. Switch to \033[1m*@slowreader.app\033[0m account"
echo "3. Click on \033[1mManage Custom Domains\033[0m"
echo "4. Click on \033[1mAdd Mapping\033[0m"
echo "5. Add \033[1mdev.slowreader.app\033[0m domain to \033[1mstaging\033[0m"

#!/bin/bash

# Configuration - replace these with your actual values or set as environment variables
PROJECT_ID="${GCP_PROJECT_ID:-YOUR_PROJECT_ID}"
CLIENT_ID="${GCP_CLIENT_ID:-YOUR_CLIENT_ID}"
CLIENT_SECRET="${GCP_CLIENT_SECRET:-YOUR_CLIENT_SECRET}"
AUTH_ID="p402-auth"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: 'gcloud' CLI is not found on your machine."
    echo "--------------------------------------------------------"
    echo "👉 Recommended Solution: Google Cloud Shell"
    echo "1. Open https://console.cloud.google.com"
    echo "2. Click the 'Activate Cloud Shell' icon (>_) in the top right."
    echo "3. Set environment variables and run this script:"
    echo "   export GCP_PROJECT_ID=your-project-id"
    echo "   export GCP_CLIENT_ID=your-client-id"
    echo "   export GCP_CLIENT_SECRET=your-client-secret"
    echo "   ./scripts/register_google_auth.sh"
    echo ""
    exit 1
fi

if [[ "$CLIENT_ID" == "YOUR_CLIENT_ID" ]]; then
    echo "❌ Error: Please set your credentials as environment variables:"
    echo "   export GCP_PROJECT_ID=your-project-id"
    echo "   export GCP_CLIENT_ID=your-client-id"
    echo "   export GCP_CLIENT_SECRET=your-client-secret"
    exit 1
fi

echo "Registering Authorization Resource for Project: $PROJECT_ID..."

curl -X POST \
   -H "Authorization: Bearer $(gcloud auth print-access-token)" \
   -H "Content-Type: application/json" \
   "https://global-discoveryengine.googleapis.com/v1alpha/projects/$PROJECT_ID/locations/global/authorizations?authorizationId=$AUTH_ID" \
   -d '{
      "name": "projects/'"$PROJECT_ID"'/locations/global/authorizations/'"$AUTH_ID"'",
      "serverSideOauth2": {
         "clientId": "'"$CLIENT_ID"'",
         "clientSecret": "'"$CLIENT_SECRET"'",
         "authorizationUri": "https://accounts.google.com/o/oauth2/auth",
         "tokenUri": "https://oauth2.googleapis.com/token"
      }
   }'

echo -e "\n\nCommand sent."

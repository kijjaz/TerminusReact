#!/bin/bash
set -e

# Suggest Project ID if not set
if [ -z "$GOOGLE_CLOUD_PROJECT" ]; then
    echo "Please set GOOGLE_CLOUD_PROJECT or enter it below:"
    read -p "Project ID: " PROJECT_ID
else
    PROJECT_ID=$GOOGLE_CLOUD_PROJECT
fi

echo "Deploying 'terminus' to Cloud Run (Project: $PROJECT_ID)..."

# Deploy using source (which uses the Dockerfile)
gcloud run deploy terminus \
    --source . \
    --project "$PROJECT_ID" \
    --region us-central1 \
    --allow-unauthenticated \
    --port 8080

echo "Deployment initiated."

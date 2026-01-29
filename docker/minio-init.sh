#!/bin/sh
# MinIO bucket initialization script
# Run after MinIO is healthy to create the default bucket

set -e

MINIO_HOST="${MINIO_HOST:-http://localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
BUCKET_NAME="${BUCKET_NAME:-bf-fund-dataroom}"

echo "Waiting for MinIO to be ready..."
until curl -sf "${MINIO_HOST}/minio/health/live" > /dev/null 2>&1; do
  echo "MinIO not ready, waiting..."
  sleep 2
done

echo "MinIO is ready. Configuring mc client..."

# Configure mc client
mc alias set myminio "${MINIO_HOST}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}"

# Create bucket if it doesn't exist
if mc ls myminio/${BUCKET_NAME} > /dev/null 2>&1; then
  echo "Bucket '${BUCKET_NAME}' already exists"
else
  echo "Creating bucket '${BUCKET_NAME}'..."
  mc mb myminio/${BUCKET_NAME}
  echo "Bucket created successfully"
fi

# Set bucket policy to private (default)
echo "Setting bucket policy..."
mc anonymous set none myminio/${BUCKET_NAME}

echo "MinIO initialization complete!"
echo ""
echo "Configuration for your app:"
echo "  STORAGE_PROVIDER=s3"
echo "  STORAGE_ENDPOINT=${MINIO_HOST}"
echo "  STORAGE_BUCKET=${BUCKET_NAME}"
echo "  STORAGE_ACCESS_KEY_ID=${MINIO_ACCESS_KEY}"
echo "  STORAGE_SECRET_ACCESS_KEY=${MINIO_SECRET_KEY}"
echo "  STORAGE_REGION=us-east-1"

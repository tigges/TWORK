#!/bin/sh
# Fast-forward main and rebuild only the app container when that commit changed.
# Postgres and MinIO are left running. A dirty tree or a CHANGE_ME password aborts.
set -eu

cd "$(dirname "$0")/.."

exec 9>/tmp/twork-deploy.lock
if ! flock -n 9; then
  echo "deploy already running"
  exit 0
fi

if [ -f .env ] && grep -Eq '^(DATABASE_URL|POSTGRES_PASSWORD|MINIO_ACCESS_KEY|MINIO_SECRET_KEY)=.*CHANGE_ME' .env; then
  echo "refusing to rebuild: .env still has CHANGE_ME" >&2
  exit 1
fi

git fetch --prune origin main

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "refusing to deploy: working tree has changes" >&2
  exit 1
fi

remote=$(git rev-parse origin/main)
head=$(git rev-parse HEAD)
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" = "main" ] && [ "$head" = "$remote" ]; then
  exit 0
fi

git checkout main
git pull --ff-only origin main
docker compose up -d --build app
echo "$(date -Is) deployed $(git rev-parse --short HEAD)"

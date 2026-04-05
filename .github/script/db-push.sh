#!/bin/bash

set -e

ROOT_DIR="$(dirname "$0")/../.."

export $(cat "$ROOT_DIR/.env.local" | grep -v '^#' | xargs)

echo "▶ Dump de la base locale..."
docker compose exec -T db pg_dump \
  -U ${POSTGRES_USER:-kyx_user} \
  -d ${POSTGRES_DATABASE:-kyx_db} \
  -F c --no-owner --no-acl > kyx_backup.dump

echo "▶ Envoi sur le VPS..."
scp kyx_backup.dump kyx:/tmp/kyx_backup.dump

echo "▶ Restore sur le VPS..."
ssh kyx "docker compose -f /home/debian/kyx/docker-compose.yml cp /tmp/kyx_backup.dump db-prod:/tmp/kyx_backup.dump && \
  docker compose -f /home/debian/kyx/docker-compose.yml exec -T db-prod pg_restore \
    -U kyx_prod -d kyx_prod \
    --clean --if-exists --no-owner --no-acl \
    -F c /tmp/kyx_backup.dump; \
  docker compose -f /home/debian/kyx/docker-compose.yml exec -T db-prod rm /tmp/kyx_backup.dump; \
  rm /tmp/kyx_backup.dump"

echo "▶ Nettoyage local..."
rm kyx_backup.dump

echo "✅ Base de données poussée sur le VPS !"

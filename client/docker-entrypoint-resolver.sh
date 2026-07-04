#!/bin/sh
set -e

# Railway's container runtime doesn't expose Docker's embedded DNS at
# 127.0.0.11 the way plain Docker does. Discover whatever nameserver this
# environment actually provides via /etc/resolv.conf and export it so the
# nginx.conf.template's `resolver ${RESOLVER}` directive gets a real,
# reachable address (envsubst substitutes any currently-exported env var).
export RESOLVER="$(awk '/^nameserver/ { print $2; exit }' /etc/resolv.conf)"

exec /docker-entrypoint.sh "$@"

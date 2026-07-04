#!/bin/sh
set -e

# Railway's container runtime doesn't expose Docker's embedded DNS at
# 127.0.0.11 the way plain Docker does. Discover whatever nameserver this
# environment actually provides via /etc/resolv.conf and export it so the
# nginx.conf.template's `resolver ${RESOLVER}` directive gets a real,
# reachable address (envsubst substitutes any currently-exported env var).
NAMESERVER="$(awk '/^nameserver/ { print $2; exit }' /etc/resolv.conf)"
case "$NAMESERVER" in
  # nginx requires IPv6 resolver addresses in bracket syntax, otherwise it
  # misparses the colons as a port separator (Railway's internal resolver
  # is IPv6, e.g. fd12::10).
  *:*) export RESOLVER="[$NAMESERVER]" ;;
  *) export RESOLVER="$NAMESERVER" ;;
esac

exec /docker-entrypoint.sh "$@"

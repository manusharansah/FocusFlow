#!/usr/bin/env bash
# Keeps a DuckDNS name pointed at this server. Run from cron every 5 minutes:
#   */5 * * * * DUCKDNS_SUBDOMAIN=focusflow-yourname DUCKDNS_TOKEN=... /opt/focusflow/deploy/duckdns-update.sh
# An Elastic IP makes the address stable, so this is only a safety net. The token lives only on the server.
set -euo pipefail
: "${DUCKDNS_SUBDOMAIN:?}" "${DUCKDNS_TOKEN:?}"
curl -fsS "https://www.duckdns.org/update?domains=${DUCKDNS_SUBDOMAIN}&token=${DUCKDNS_TOKEN}&ip=" > /dev/null

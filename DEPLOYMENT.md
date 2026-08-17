# Mikazuki — Deployment & Operations Guide

## Quick Start (Docker)

```bash
# Build and run
docker compose up -d --build

# Check status
docker inspect --format='{{.State.Health.Status}}' mikazuki

# Tail logs
docker logs -f mikazuki
```

## Quick Start (systemd, no Docker)

```bash
# Build locally
pnpm build

# Install and start
sudo bash scripts/install.sh
```

## Logs

All logs are JSON lines (production) or colored text (TTY/dev).

### systemd

```bash
# Live tail
journalctl -u mikazuki -f

# Last hour
journalctl -u mikazuki --since "1 hour ago"

# Errors only
journalctl -u mikazuki -p err

# Since last boot
journalctl -u mikazuki -b
```

### Docker

```bash
# Live tail
docker logs -f mikazuki

# Last 100 lines
docker logs --tail 100 mikazuki

# Since timestamp
docker logs --since "2024-01-01T00:00:00" mikazuki
```

### Log format (non-TTY)

```json
{"ts":"2024-01-01T12:00:00.000Z","level":"info","msg":"ready","tag":"Mikazuki#1234"}
{"ts":"2024-01-01T12:00:05.000Z","level":"info","msg":"clean","channelId":"123","author":"user"}
{"ts":"2024-01-01T12:00:05.000Z","level":"error","msg":"processMessage","err":"timeout","msgId":"456"}
```

### Querying logs with jq

```bash
# All errors
journalctl -u mikazuki -o json | jq 'select(.LEVEL=="error")'

# Clean actions in a specific channel
journalctl -u mikazuki -o json | jq 'select(.msg=="clean" and .channelId=="123")'

# Count cleans per hour
journalctl -u mikazuki -o json --since "24 hours ago" | jq -s 'group_by(.ts[:13]) | map({hour: .[0].ts[:13], count: length})'
```

## Health Checks

### Heartbeat file

The bot writes a timestamp to `/tmp/mikazuki-alive` every 60 seconds.

```bash
# Seconds since last heartbeat
echo $(( $(date +%s) - $(cat /tmp/mikazuki-alive | head -c 10) ))

# Quick alive check (exit 0 = alive)
[ "$(( $(date +%s) - $(cat /tmp/mikazuki-alive | head -c 10) ))" -lt 120 ] && echo "alive" || echo "dead"
```

### Docker health status

```bash
docker inspect --format='{{.State.Health.Status}}' mikazuki
# healthy | unhealthy | starting
```

### systemd status

```bash
systemctl status mikazuki
```

## Service Management

```bash
# Restart
sudo systemctl restart mikazuki

# Stop
sudo systemctl stop mikazuki

# View service logs
journalctl -u mikazuki -e
```

## Disk Usage

Docker logs are capped at 10MB × 3 files (30MB max).

```bash
# Check Docker disk usage
docker system df

# Prune old logs
docker system prune
```

The link log (`.data/link-log.jsonl`) grows slowly — one line per rewritten URL. Rotate manually or via logrotate if needed.

## Error Recovery

The bot auto-restarts on crash (5s delay via systemd, immediate via Docker `restart: unless-stopped`).

```bash
# Check crash history
journalctl -u mikazuki | grep "unhandledRejection\|uncaughtException"

# Check restart count
systemctl show mikazuki | grep NRestarts
```

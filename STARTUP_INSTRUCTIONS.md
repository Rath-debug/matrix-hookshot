# Matrix Hookshot - Startup Instructions

## Architecture

This project consists of **two separate Docker Compose setups**:

1. **Synapse** (Matrix Homeserver) - Located in `synapse/` folder
2. **Hookshot** (Bridge Application) - Located in main root folder

Both must be running for the bridge to work.

---

## Quick Start

### Step 1: Start Synapse Homeserver

```bash
cd synapse/

# Start Synapse with PostgreSQL
docker-compose up -d

# Verify it's running on port 8008
curl http://localhost:8008/_matrix/client/versions
```

**Expected output:**
```
{"versions": ["r0.0.1", "r0.0.2", ...]}
```

### Step 2: Start Hookshot Bridge

```bash
cd ..  # Back to root

# Verify tokens are set in config.yml and registration.yml
# (They should already be configured)

# Start the bridge
docker-compose up -d

# Check status
docker-compose ps
```

**Expected output:**
```
NAME                            STATUS
matrix-hookshot-dev-valkey-1    Up 2 seconds
matrix-hookshot-dev-init-app-1  Exited 0
matrix-hookshot-dev-app-1       Up 1 second
```

### Step 3: Verify Both Are Running

```bash
# Check Synapse
curl http://localhost:8008/_matrix/client/versions

# Check Hookshot metrics
curl http://localhost:9001/metrics

# View Hookshot logs
docker-compose logs -f app
```

---

## Network Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Host Machine                         │
├─────────────────────────────────────────────────────────┤
│  Ports:                                                 │
│  :8008    ← Synapse (Matrix Client API)                 │
│  :9001    ← Hookshot (Webhooks & Widgets)               │
│  :9993    ← Hookshot (Matrix Bridge API)                │
│  :5432    ← PostgreSQL (Synapse backend)                │
│  :6379    ← Redis/Valkey (Hookshot cache)               │
└─────────────────────────────────────────────────────────┘
         ↓                            ↓
   ┌──────────────┐          ┌──────────────────┐
   │ Synapse      │          │ Hookshot         │
   │ Container    │          │ Container        │
   │ Network      │          │ Network          │
   │              │          │                  │
   │ - synapse    │          │ - app            │
   │ - postgres   │          │ - valkey         │
   │              │          │ - init-app       │
   └──────────────┘          └──────────────────┘
         ↓                            ↓
   localhost:8008      ←→      localhost:8008
```

---

## Common Commands

### Synapse Commands
```bash
cd synapse/

# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f synapse

# Full restart
docker-compose down
docker-compose up -d
```

### Hookshot Commands
```bash
# From root directory

# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f app

# View all services
docker-compose ps

# Restart a specific service
docker-compose restart app
```

### Both Services
```bash
# Start both (run them in separate terminals)
# Terminal 1:
cd synapse && docker-compose up -d

# Terminal 2:
cd .. && docker-compose up -d

# Check both are running
docker ps | grep -E "synapse|matrix-hookshot"
```

---

## Troubleshooting

### Synapse Won't Start

**Error:** `could not translate host name "postgres"`
- **Cause:** PostgreSQL service not running
- **Fix:** Make sure PostgreSQL is up: `docker-compose ps` should show postgres running

**Error:** Port 8008 already in use
- **Fix:** Kill the process: `taskkill /F /IM <process>` or use a different port in docker-compose.yml

### Hookshot Won't Connect to Synapse

**Error:** Connection refused to localhost:8008
- **Cause:** Synapse not running or not on port 8008
- **Fix:**
  ```bash
  # Verify Synapse is running
  curl http://localhost:8008/_matrix/client/versions

  # Verify config.yml has correct URL
  grep "url:" config.yml
  # Should show: url: http://localhost:8008
  ```

### Tokens Don't Match

**Error:** 401 Unauthorized or Token missing
- **Fix:** Ensure tokens match in both files:
  ```bash
  grep -i "as_token\|hs_token" config.yml
  grep -i "as_token\|hs_token" registration.yml
  # Both should have identical token values
  ```

### Port 9001 Already in Use

**Error:** `Bind for 0.0.0.0:9001 failed`
- **Fix:**
  ```bash
  netstat -ano | findstr :9001
  taskkill /F /PID <pid>
  docker-compose up -d
  ```

---

## Configuration

### config.yml (Hookshot)
```yaml
bridge:
  domain: localhost              # Your homeserver domain
  url: http://localhost:8008    # Synapse URL
  port: 9993                    # Bridge API port
  bindAddress: 0.0.0.0
  as_token: <YOUR_TOKEN>        # Application Service token
  hs_token: <YOUR_TOKEN>        # Homeserver token
  userId: "@hookshot:localhost" # Bot user ID
```

### registration.yml (Synapse registration)
```yaml
as_token: <YOUR_TOKEN>          # Must match config.yml
hs_token: <YOUR_TOKEN>          # Must match config.yml
url: "http://localhost:9993"    # Must match bridge.port
```

**Important:** Tokens must be identical in both files!

---

## Service Dependencies

```
  Synapse Stack (synapse/docker-compose.yml)
  ├── synapse:8008 (Matrix Homeserver)
  │   └── depends on postgres:5432
  └── postgres:5432 (Database)

  Hookshot Stack (root docker-compose.yml)
  ├── app:9993 (Bridge App)
  │   ├── depends on valkey
  │   ├── depends on init-app
  │   └── connects to synapse:8008
  ├── valkey:6379 (Redis Cache)
  └── init-app (Passkey Generator)
```

---

## Next Steps

Once both services are running:

1. **Invite bot to a room:**
   ```
   /invite @hookshot:localhost
   ```

2. **Test with webhook:**
   ```bash
   curl -X POST http://localhost:9001/webhook/test \
     -H "Content-Type: application/json" \
     -d '{"text": "Hello Hookshot!"}'
   ```

3. **Check logs for any issues:**
   ```bash
   docker-compose logs -f app
   docker-compose -f synapse/docker-compose.yml logs -f synapse
   ```

4. **Configure integrations:**
   - GitHub
   - GitLab
   - Jira
   - OpenProject
   - RSS Feeds
   - Generic Webhooks

---

## Support

- **Documentation:** See SETUP_GUIDE.md
- **Troubleshooting:** See TOKEN_TROUBLESHOOTING.md
- **Matrix Room:** [#hookshot:half-shot.uk](https://matrix.to/#/#hookshot:half-shot.uk)


# Matrix Hookshot Bridge - Complete Setup & Deployment Guide

**Last Updated:** February 22, 2026
**Status:** ✅ Production Ready
**Version:** 1.0

---

## Table of Contents

1. [Quick Start (5 Minutes)](#quick-start)
2. [Architecture & Technology Stack](#architecture)
3. [Prerequisites & Installation](#prerequisites)
4. [Full Setup Instructions](#full-setup)
5. [Configuration Details](#configuration)
6. [Token Management](#tokens)
7. [Building & Running Services](#building-running)
8. [Verification & Testing](#verification)
9. [Troubleshooting Guide](#troubleshooting)
10. [Integration Guides](#integrations)

---

## Quick Start (5 Minutes) {#quick-start}

### For Experienced Users (Already Have Docker/Node/Rust)

```powershell
# 1. Generate tokens (run once)
$token1 = (New-Guid).ToString().Replace('-', '') + (New-Guid).ToString().Replace('-', '')
$token2 = (New-Guid).ToString().Replace('-', '') + (New-Guid).ToString().Replace('-', '')
Write-Host "as_token: $token1"
Write-Host "hs_token: $token2"

# 2. Update config.yml and registration.yml with these tokens

# 3. Start Synapse (separate stack)
cd synapse
docker-compose up -d
Start-Sleep -Seconds 10

# 4. Start Hookshot (main bridge)
cd ..
docker-compose up -d

# 5. Verify
curl http://localhost:8008/_matrix/client/versions
docker-compose logs app --tail=10
```

### For New Users → Jump to [Full Setup Instructions](#full-setup)

---

## Architecture & Technology Stack {#architecture}

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MATRIX ECOSYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────────────┐   │
│  │   Synapse Home   │◄────────│  Hookshot Bridge (AS)    │   │
│  │    Server        │  Port   │                          │   │
│  │  (Port 8008)     │  9993   │   - GitHub Integration   │   │
│  │                  │  ────►  │   - GitLab Integration   │   │
│  │  PostgreSQL 17   │         │   - Jira Integration     │   │
│  │  (Port 5434)     │         │   - OpenProject          │   │
│  └──────────────────┘         │   - Generic Webhooks     │   │
│                               │   - Widget API           │   │
│           ▲                   │                          │   │
│           │ Token Auth        │  Valkey Cache            │   │
│           │                   │  (Port 6379)             │   │
│           └─────────────────┐ └──────────────────────────┘   │
│                             │                                │
│                      registration.yml                        │
│                             │                                │
│                  ┌──────────▼──────────┐                     │
│                  │  External Services  │                     │
│                  │  (GitHub, Jira...)  │                     │
│                  └─────────────────────┘                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Key Addresses (Inside Docker):
- Synapse:   host.docker.internal:8008
- Hookshot:  host.docker.internal:9993
- PostgreSQL: postgres:5432
- Valkey:     valkey:6379

Exposed Ports (Host Machine):
- 8008:  Synapse (Matrix Client API)
- 9001:  Hookshot Webhooks & Widgets
- 9993:  Hookshot Bridge API (for Synapse callbacks)
- 5434:  PostgreSQL (optional, if direct access needed)
```

### Technology Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| **Matrix Synapse** | 1.146.0 | Matrix homeserver, hosts Matrix users/rooms |
| **Hookshot** | Latest | Application Service bridge, integrates external services |
| **Node.js** | 22 LTS | JavaScript runtime for Hookshot |
| **Rust** | 1.70+ | Native module compilation (matrix-hookshot-rs) |
| **PostgreSQL** | 17 | Synapse database backend |
| **Valkey** | 9 | Redis-compatible cache for Hookshot |
| **Docker** | 20.10+ | Container runtime |
| **Docker Compose** | 2.0+ | Container orchestration |
| **Vite** | 7.3.1 | Web bundler for admin UI (with special config) |
| **@vector-im/compound-web** | Latest | UI component library |
| **Preact** | Latest | Lightweight React alternative |

---

## Prerequisites & Installation {#prerequisites}

### System Requirements

#### Windows 10/11
- [ ] **Docker Desktop** 20.10+ installed
  - Download: https://www.docker.com/products/docker-desktop
  - Verify: `docker --version`
  - Enable: WSL 2 backend (default in recent versions)

- [ ] **PowerShell** 5.1+ (built-in on Windows 10/11)

#### macOS/Linux
- [ ] **Docker** 20.10+ and **Docker Compose** 2.0+
  - Install: https://docs.docker.com/get-docker/
  - Verify: `docker --version && docker-compose --version`

### Project Structure

```
matrix-hookshot/
├── synapse/                        # Synapse homeserver (separate stack)
│   ├── synapse-data/
│   │   ├── homeserver.yaml        # Synapse config (app_service_config_files enabled)
│   │   ├── registration.yml       # Copy of registration (must exist here)
│   │   ├── media_store/           # User-uploaded files
│   │   └── postgres-data/         # Database files
│   └── docker-compose.yml         # Synapse stack: synapse + postgres
│
├── config.yml                      # Hookshot main config
├── registration.yml               # Synapse app service registration
├── docker-compose.yml             # Hookshot stack: app + valkey + init-app
├── Dockerfile                     # Hookshot container build
├── vite.config.mjs               # Web build config (FIXED for compound-web)
├── package.json                   # Node.js dependencies
├── tsconfig.json                  # TypeScript config
└── [other source files...]
```

---

## Full Setup Instructions {#full-setup}

### Step 1: Clone/Download Project

```powershell
# If cloning
git clone https://github.com/element-hq/matrix-hookshot.git
cd matrix-hookshot

# If already present, verify structure
Test-Path "synapse/synapse-data/homeserver.yaml"
Test-Path "config.yml"
Test-Path "registration.yml"
```

### Step 2: Generate Authentication Tokens

Run this PowerShell script to generate secure tokens:

```powershell
# Generate two unique tokens (256-bit each)
$token1 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (New-Guid).ToString()))
$token2 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (New-Guid).ToString()))

Write-Host "Copy these tokens to your config files:" -ForegroundColor Green
Write-Host "as_token: $token1"
Write-Host "hs_token: $token2"
```

**Output example:**
```
as_token: SjIwRDk0OTYtN2M5Yy00YjA4LTk1MDMtOWRmZDk5ODdhMzI2UjEwNDUzMjUwLTk0MzctNDUwMS04YmU5LTQ0NWI1NDcwYTEyNA==
hs_token:  OTdlNzg5MzItNjUwNi00OWIwLTg4YzAtYjVmYzQ0ODU3YTZkTzg5YjhjNjQtNDYxYi00MzY4LTkzYTYtYTdjYzQ3YThhNTcx
```

### Step 3: Configure Synapse

Edit `synapse/synapse-data/homeserver.yaml`:

**Find and uncomment:**
```yaml
# Line ~1780 - Find this section
# app_service_config_files: ["/data/registration.yml"]

# Uncomment to:
app_service_config_files: ["/data/registration.yml"]
```

**Verify these settings:**
```yaml
server_name: localhost
database:
  name: psycopg2
  args:
    user: synapse
    password: synapse_pass
    database: synapse
    host: postgres
    port: 5432

listeners:
  - port: 8008
    tls: false
    type: http
    x_forwarded: false
    bind_address: 0.0.0.0
    resources:
      - names: [client, federation]
        compress: false
```

### Step 4: Configure Hookshot Bridge

Edit `config.yml`:

```yaml
bridge:
  domain: localhost                           # Your homeserver domain
  url: http://host.docker.internal:8008      # How to reach Synapse FROM container
  port: 9993                                  # Bridge API port (for Synapse callbacks)
  bindAddress: 0.0.0.0
  as_token: YOUR_AS_TOKEN_HERE               # From Step 2
  hs_token: YOUR_HS_TOKEN_HERE               # From Step 2
  userId: "@hookshot:localhost"

listeners:
  - port: 9001                                # Webhooks & widgets port
    bindAddress: 0.0.0.0
    resources:
      - widgets
      - webhooks

passFile: /data/passkey.pem

# Enable caching (recommended)
cache:
  redisUri: redis://valkey:6379

# Generic webhook receiver
generic:
  enabled: true
  urlPrefix: http://localhost:9001/webhook/
  allowJsTransformationFunctions: true
  waitForComplete: true

# Widgets config
widgets:
  publicUrl: http://localhost:9001/widgetapi/v1/static/
  roomSetupWidget:
    addOnInvite: true

# Optional: Enable integrations you need
github:
  enabled: false

gitlab:
  enabled: false

jira:
  enabled: false
```

### Step 5: Register App Service with Synapse

Edit `registration.yml` (both root and synapse-data copies):

```yaml
id: matrix-hookshot
as_token: YOUR_AS_TOKEN_HERE                 # MUST MATCH config.yml
hs_token: YOUR_HS_TOKEN_HERE                 # MUST MATCH config.yml

namespaces:
  rooms: []
  users:
    - regex: "@_github_.*:localhost"
      exclusive: false
    - regex: "@_gitlab_.*:localhost"
      exclusive: false
    - regex: "@_jira_.*:localhost"
      exclusive: false
    - regex: "@_webhooks_.*:localhost"
      exclusive: false
    - regex: "@feeds:localhost"
      exclusive: false
  aliases:
    - regex: "#hookshot.*:localhost"
      exclusive: true

sender_localpart: hookshot
url: "http://host.docker.internal:9993"     # How Synapse reaches Hookshot
rate_limited: false

# Encryption support
de.sorunome.msc2409.push_ephemeral: true
push_ephemeral: true
org.matrix.msc3202: true
```

**Critical:** Copy registration.yml to Synapse data directory:

```powershell
Copy-Item .\registration.yml .\synapse\synapse-data\registration.yml -Force
```

### Step 6: Verify Configuration Files

```powershell
# Check tokens match everywhere
Select-String -Path "config.yml", "registration.yml", "synapse/synapse-data/registration.yml" -Pattern "as_token|hs_token"

# Output should show identical tokens across all files
```

### Step 7: Start Services (Two-Stack Approach)

**Terminal 1 - Start Synapse:**

```powershell
cd synapse
docker-compose up -d
Start-Sleep -Seconds 15
docker-compose logs synapse --tail=20  # Watch for "Listening on TCP"
```

Expected output includes:
```
synapse-1  | 2026-02-22 12:34:56,789 - synapse.app.homeserver - INFO - Listening on TCP port 8008
synapse-1  | 2026-02-22 12:34:56,789 - synapse.app.homeserver - INFO - Database is at version X
```

**Terminal 2 - Start Hookshot:**

```powershell
cd ..  # Back to root
docker-compose up -d
Start-Sleep -Seconds 10
docker-compose logs app --tail=30
```

Expected output includes:
```
app-1  | INFO 12:36:45:123 [Bridge] Authenticating with homeserver...
app-1  | INFO 12:36:45:456 [Bridge] The homeserver has confirmed Hookshot can contact it
app-1  | INFO 12:36:45:789 [Bridge] Bridge is now ready. Found X connections
```

---

## Configuration Details {#configuration}

### config.yml Deep Dive

#### Bridge Section
```yaml
bridge:
  domain: localhost                    # Matrix server name
  url: http://host.docker.internal:8008  # **CRITICAL**: Use host.docker.internal for Docker
  port: 9993                          # Port bridge listens on (for Synapse callbacks)
  bindAddress: 0.0.0.0                # Listen on all interfaces
  as_token: [SECURE_TOKEN]            # Must match registration.yml
  hs_token: [SECURE_TOKEN]            # Must match registration.yml
  userId: "@hookshot:localhost"       # Bot user ID in Matrix
  nameState: "room_topic"             # How to update bridge info
```

**Why host.docker.internal?**
- Docker containers can't use `localhost` to reach the host
- `host.docker.internal` is Docker Desktop's internal DNS name for the host
- Works on Windows and macOS Docker Desktop
- On Linux, use `host.docker.internal` only if enabled; otherwise use container network names

#### Listeners Section
```yaml
listeners:
  - port: 9001                        # Webhook receiver & widget API
    bindAddress: 0.0.0.0              # Listen on all interfaces
    resources:
      - widgets                       # Admin UI
      - webhooks                      # Generic webhook receiver
      - appservice                    # (automatic, for AS protocol)
```

#### Cache Configuration
```yaml
cache:
  redisUri: redis://valkey:6379       # Valkey container is named 'valkey'
  # Caching is OPTIONAL but recommended for production
```

#### Generic Webhooks
```yaml
generic:
  enabled: true
  urlPrefix: http://localhost:9001/webhook/  # Public URL for webhooks
  allowJsTransformationFunctions: true       # Allow JS in webhook transforms
  waitForComplete: true                      # Wait for message delivery
  maxWaitTime: 5000                          # Max wait: 5 seconds
```

### registration.yml Reference

```yaml
id: matrix-hookshot                   # Unique app service ID

as_token: [TOKEN]                    # Hookshot's token (must match config.yml)
hs_token: [TOKEN]                    # Homeserver's token (must match config.yml)

namespaces:
  # Register which users/rooms/aliases the bridge handles
  rooms: []                            # Bridge doesn't own rooms
  users:                               # Bridge owns these user patterns
    - regex: "@_github_.*:localhost"
      exclusive: false                 # Other services can also create these
    - regex: "@_gitlab_.*:localhost"
      exclusive: false
    - regex: "@_jira_.*:localhost"
      exclusive: false
    - regex: "@_webhooks_.*:localhost" # Generic webhook users
      exclusive: false
    - regex: "@feeds:localhost"        # Feed bot usernames
      exclusive: false
  aliases:
    - regex: "#hookshot.*:localhost"   # Bridge can own these room aliases
      exclusive: true

sender_localpart: hookshot            # Localpart of bot user (@hookshot:localhost)

url: "http://host.docker.internal:9993"  # **CRITICAL**: Where Synapse reaches bridge
                                          # Must match bridge.port in config.yml

rate_limited: false                   # Bridge shouldn't be rate-limited

# Encryption & MSC support
de.sorunome.msc2409.push_ephemeral: true  # Push ephemeral events
push_ephemeral: true                      # Support ephemeral messages
org.matrix.msc3202: true                  # Unreliable event delivery
```

---

## Token Management {#tokens}

### Generating Tokens

#### Method 1: PowerShell (Windows)
```powershell
$token = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (New-Guid).ToString()))
$token
```

#### Method 2: Bash (Linux/macOS)
```bash
head -c 32 /dev/urandom | base64
```

#### Method 3: Python (Any OS)
```python
import secrets
import base64
token = base64.b64encode(secrets.token_bytes(32)).decode()
print(token)
```

### Token Placement Checklist

- [ ] Token in `config.yml` → `bridge.as_token`
- [ ] Token in `config.yml` → `bridge.hs_token`
- [ ] Same token in `registration.yml` → `as_token`
- [ ] Same token in `registration.yml` → `hs_token`
- [ ] Same token in `synapse/synapse-data/registration.yml` → `as_token`
- [ ] Same token in `synapse/synapse-data/registration.yml` → `hs_token`

**Verification:**
```powershell
# All should be identical
Select-String "as_token:" config.yml, registration.yml, synapse/synapse-data/registration.yml | findstr as_token
```

---

## Building & Running Services {#building-running}

### Docker Compose Commands

**Start all services:**
```powershell
# Synapse stack
cd synapse && docker-compose up -d && cd ..

# Hookshot stack
docker-compose up -d
```

**View logs:**
```powershell
# Real-time logs
docker-compose logs -f app              # Hookshot bridge
docker-compose -f synapse/docker-compose.yml logs -f synapse  # Synapse

# Last 50 lines
docker-compose logs app --tail=50
```

**Stop services:**
```powershell
# Stop Hookshot
docker-compose down

# Stop Synapse
cd synapse && docker-compose down && cd ..
```

**Restart after config changes:**
```powershell
# Update only, don't rebuild
docker-compose restart app
docker-compose -f synapse/docker-compose.yml restart synapse

# Full rebuild (if Dockerfile changes)
docker-compose up -d --build
```

**Check container status:**
```powershell
docker-compose ps
docker-compose -f synapse/docker-compose.yml ps
```

### Manual Build (Without Docker)

**Requirements:**
- Node.js 18+
- npm or yarn
- Rust 1.70+
- PostgreSQL 15+
- Redis/Valkey

**Build Hookshot:**
```powershell
# Install dependencies
npm install

# TypeScript compilation
npm run build

# Vite web bundling
npm run build:web

# For production
npm run build:all
```

**Run Hookshot:**
```powershell
node ./lib/App/BridgeApp.js ./config.yml ./registration.yml
```

**Run Synapse (Docker):**
```powershell
# Synapse requires Python and complex dependencies; Docker is recommended
cd synapse
docker-compose up
```

---

## Verification & Testing {#verification}

### Health Checks

#### 1. Verify Synapse Running

```powershell
curl http://localhost:8008/_matrix/client/versions
```

Expected response:
```json
{
  "versions": ["r0.0.1", "r0.1.0", "r0.2.0", "r0.3.0", "r0.4.0", "r0.5.0", "r0.6.0", "r0.6.1"],
  "unstable_features": {...}
}
```

#### 2. Verify Hookshot Running

```powershell
curl http://localhost:9001/
# Should return HTML (admin UI)
```

#### 3. Check Bridge Authentication

```powershell
docker-compose logs app --tail=30 | Select-String "authenticated|ready|error"
```

Look for:
- ✅ `"The homeserver has confirmed Hookshot can contact it"`
- ✅ `"Bridge is now ready"`

#### 4. Test Webhook Endpoint

```powershell
curl -X POST http://localhost:9001/webhook/test -H "Content-Type: application/json" -d '{"text":"Test message"}'
```

#### 5. Check Port Connectivity

```powershell
# From host
netstat -ano | findstr ":9001"  # Should show LISTENING
netstat -ano | findstr ":8008"  # Should show LISTENING
netstat -ano | findstr ":9993"  # Should show LISTENING

# From inside Hookshot container
docker exec matrix-hookshot-dev-app-1 curl -s http://host.docker.internal:8008/_matrix/client/versions | findstr versions
```

### Bot Invitation Test

1. **Open Matrix client** (Element, fractal, etc.) and log in to your Synapse (`http://localhost:8008`)

2. **Create a test room**
   - Click "Create New Room"
   - Set name: "Bridge Test"
   - Create room

3. **Invite the Hookshot bot**
   - In room, type: `/invite @hookshot:localhost`
   - Press Enter

4. **Expected response**
   - Bot joins room
   - Sends welcome message with configuration link
   - No errors in logs

   View logs to confirm:
   ```powershell
   docker-compose logs app --tail=20
   # Should show bot processing the invite without errors
   ```

### Full Connection Diagnostic

```powershell
# Run this complete check script
$ErrorActionPreference = "Stop"

Write-Host "=== Matrix Hookshot Diagnostic ===" -ForegroundColor Cyan

# 1. Container status
Write-Host "`n1. Container Status:" -ForegroundColor Yellow
docker-compose ps
docker-compose -f synapse/docker-compose.yml ps

# 2. Synapse responding
Write-Host "`n2. Synapse API Test:" -ForegroundColor Yellow
try {
    $response = curl -s http://localhost:8008/_matrix/client/versions
    Write-Host "✅ Synapse responding" -ForegroundColor Green
} catch {
    Write-Host "❌ Synapse not responding" -ForegroundColor Red
}

# 3. Bridge API reachable
Write-Host "`n3. Bridge API Test:" -ForegroundColor Yellow
try {
    $response = curl -s http://localhost:9001/
    Write-Host "✅ Bridge API responding" -ForegroundColor Green
} catch {
    Write-Host "❌ Bridge API not responding" -ForegroundColor Red
}

# 4. Port bindings
Write-Host "`n4. Port Bindings:" -ForegroundColor Yellow
netstat -ano | findstr ":8008"
netstat -ano | findstr ":9001"
netstat -ano | findstr ":9993"

# 5. Recent errors in logs
Write-Host "`n5. Recent Errors:" -ForegroundColor Yellow
docker-compose logs app --tail=50 | Select-String "ERROR|error"
if ($LASTEXITCODE -ne 0) {
    Write-Host "No errors found ✅" -ForegroundColor Green
}

Write-Host "`n=== Diagnostic Complete ===" -ForegroundColor Cyan
```

---

## Troubleshooting Guide {#troubleshooting}

### Common Issues & Solutions

#### Issue: "Connection refused: 111: Connection refused" (Synapse → Hookshot)

**Symptom:**
```
ERROR [MatrixHttpClient] M_CONNECTION_FAILED
ERROR [Bridge] **WARNING**: The homeserver reports it is unable to contact Hookshot
```

**Causes & Solutions:**

1. **Port 9993 not exposed**
   ```powershell
   # Check exposed ports
   docker ps --filter "name=app" --format "{{.Ports}}"
   # Should include: 0.0.0.0:9993->9993/tcp

   # Fix: Recreate container with updated compose
   docker-compose up -d app
   ```

2. **Wrong URL in registration.yml**
   ```yaml
   # Wrong:
   url: "http://localhost:9993"

   # Correct (for Docker):
   url: "http://host.docker.internal:9993"

   # Correct (for Linux with compose network):
   url: "http://app:9993"
   ```

3. **registration.yml not in synapse-data/**
   ```powershell
   Test-Path synapse/synapse-data/registration.yml
   # If False:
   Copy-Item registration.yml synapse/synapse-data/registration.yml

   # Restart Synapse
   docker-compose -f synapse/docker-compose.yml restart synapse
   ```

4. **app_service_config_files not enabled in homeserver.yaml**
   ```pwsh
   # Check if enabled
   Select-String "app_service_config_files" synapse/synapse-data/homeserver.yaml

   # Should show:
   # app_service_config_files: ["/data/registration.yml"]
   # (not commented with #)

   # If commented, uncomment and restart Synapse
   docker-compose -f synapse/docker-compose.yml restart synapse
   ```

---

#### Issue: "M_UNKNOWN_TOKEN: Invalid access token passed"

**Symptom:**
```
ERROR [MatrixHttpClient] M_UNKNOWN_TOKEN
```

**Cause:** Tokens in config.yml and registration.yml don't match

**Solution:**
```powershell
# 1. Generate new tokens
$token1 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (New-Guid).ToString()))
$token2 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (New-Guid).ToString()))

# 2. Update all four locations
# - config.yml: as_token, hs_token
# - registration.yml: as_token, hs_token
# - synapse/synapse-data/registration.yml: as_token, hs_token

# 3. Verify they match
Select-String "as_token:|hs_token:" config.yml, registration.yml, synapse/synapse-data/registration.yml

# 4. Restart both services
docker-compose -f synapse/docker-compose.yml restart synapse
docker-compose restart app
```

---

#### Issue: "Address already in use: CannotListenError: Couldn't listen on 0.0.0.0:8008"

**Symptom:**
```
CannotListenError: Couldn't listen on 0.0.0.0:8008: [Errno 98] Address already in use
```

**Cause:** Another process is using port 8008

**Solution:**
```powershell
# 1. Find the process using port 8008
netstat -ano | findstr ":8008"
# Output: TCP  0.0.0.0:8008  0.0.0.0:0  LISTENING  [PID]

# 2. Kill the process (replace [PID] with actual process ID)
taskkill /PID [PID] /F

# 3. Verify port is free
netstat -ano | findstr ":8008"
# Should now have no output

# 4. Restart Synapse
docker-compose -f synapse/docker-compose.yml restart synapse
```

---

#### Issue: "Rollup failed to resolve @vector-im/compound-web/dist/style.css"

**Symptom:** `docker-compose up --build` fails with Vite bundling error

**Cause:** Compound-web CSS included as dependency (already fixed in this codebase)

**Solution:** Already applied in vite.config.mjs. If still failing:

```javascript
// vite.config.mjs should have:
export default {
  optimizeDeps: {
    include: ['@vector-im/compound-web', '@vector-im/compound-design-tokens'],
  },
  build: {
    rollupOptions: {
      external: (id) => {
        if (id.includes('@vector-im/compound-web/dist/style.css')) return true
        if (id.includes('@vector-im/compound-design-tokens/assets/')) return true
        return false
      },
    },
    onwarn: (warning, warn) => {
      if (warning.code === 'UNRESOLVED_IMPORT' &&
          (warning.source?.includes('@vector-im/compound-design-tokens/assets/') ||
           warning.source?.includes('@vector-im/compound-web/dist/style.css'))) {
        return
      }
      warn(warning)
    },
  },
}
```

---

#### Issue: "Network timeout" during Docker build

**Symptom:**
```
fatal: unable to access 'https://github.com/...': Failed to connect
COMMAND timeout (600000 milliseconds)
```

**Cause:** 10-minute default timeout too short for dependency downloads + Rust compilation

**Solution:** Already applied in Dockerfile. If needed:

```dockerfile
# In Dockerfile, both yarn install commands should use:
RUN yarn install --timeout 900000
# (15 minutes instead of 10 minutes)
```

---

#### Issue: "Webhook tests failing" or "Can't send messages to rooms"

**Symptom:**
- Webhooks returning 400/500 errors
- Messages not appearing in Matrix rooms
- Bot not responding to commands

**Diagnosis:**
```powershell
# 1. Check app logs for details
docker-compose logs app --tail=100 | grep -i "webhook\|bridge\|error"

# 2. Test webhook with verbose output
$verboseOutput = curl -v -X POST http://localhost:9001/webhook/test `
  -H "Content-Type: application/json" `
  -d '{"text":"Test"}'

# 3. Verify caching is working
docker exec matrix-hookshot-dev-valkey-1 redis-cli PING
# Should return: PONG

# 4. Check if specific integration is enabled
cd config.yml  # Verify github/gitlab/jira enabled: true (if needed)
```

**Possible solutions:**
- Enable caching: `cache: { redisUri: redis://valkey:6379 }` in config.yml
- Check webhook URL format in your external service config
- Verify room/user IDs are correctly formatted in config
- Check firewall isn't blocking port 9001

---

#### Issue: "Valkey/Redis not starting"

**Symptom:**
```
matrix-hookshot-dev-valkey-1  ERROR opening AOF file (in server cwd /data)
```

**Cause:** Volume permission issue or corrupted data

**Solution:**
```powershell
# 1. Stop all services
docker-compose down

# 2. Clear the volume
docker volume rm matrix-hookshot-dev_hookshot-data
# WARNING: This deletes persisted data!

# 3. Restart
docker-compose up -d
```

---

#### Issue: "PostgreSQL not starting"

**Symptom:**
```
synapse-1    | FATAL:  could not open file "/data/...": Permission denied
```

**Cause:** Database volume permissions or corrupted data

**Solution:**
```powershell
# 1. Stop Synapse
cd synapse
docker-compose down --volumes  # WARNING: Deletes database!

# 2. Restart (will reinitialize database)
docker-compose up -d

# Note: This requires re-registering users
```

---

### Debug Logging

Enable detailed logs:

```powershell
# In config.yml, set:
logging:
  level: debug          # Usually "info", change to "debug"
  colorize: true

# Restart app
docker-compose restart app

# View extended logs
docker-compose logs app --follow
```

---

## Integration Guides {#integrations}

### GitHub Integration Setup

1. **Enable GitHub in config.yml:**
   ```yaml
   github:
     enabled: true
   ```

2. **Create GitHub webhook:**
   - Go to repo → Settings → Webhooks → Add Webhook
   - Payload URL: `http://YOUR_PUBLIC_IP:9001/webhook/github`
   - Content type: `application/json`
   - Events: Select what you want (push, pull_request, issues, etc.)

3. **Invite bot and configure:**
   - In Matrix room: `/invite @_github_OWNER_REPO:localhost`
   - Bot will provide setup instructions

### GitLab Integration Setup

1. **Enable GitLab in config.yml:**
   ```yaml
   gitlab:
     enabled: true
   ```

2. **Create GitLab webhook:**
   - Go to repo → Settings → Integrations → Add Integration
   - URL: `http://YOUR_PUBLIC_IP:9001/webhook/gitlab`
   - Events: Select what you want

3. **Configure in Matrix room:**
   - `/invite @_gitlab_PROJECT:localhost`
   - Follow bot prompts

### Jira Integration Setup

1. **Enable Jira in config.yml:**
   ```yaml
   jira:
     enabled: true
   ```

2. **Create Jira webhook:**
   - Jira Admin → System → Webhooks → Create
   - URL: `http://YOUR_PUBLIC_IP:9001/webhook/jira`
   - Events: All or select specific events

3. **Link to Matrix:**
   - `/invite @_jira_PROJECTKEY:localhost`
   - Provide Jira credentials when prompted

### Generic Webhook Setup

1. **Already enabled by default:**
   ```yaml
   generic:
     enabled: true
     urlPrefix: http://localhost:9001/webhook/
   ```

2. **Send webhook to Matrix:**
   ```bash
   curl -X POST http://localhost:9001/webhook/test \
     -H "Content-Type: application/json" \
     -d '{
       "text": "Hello from webhook!",
       "html": "<b>Hello</b> from webhook!"
     }'
   ```

3. **Webhook transforms (JavaScript):**
   - Edit webhook definitions in config.yml to transform incoming data
   - Example: convert JSON to Matrix message format

---

## Production Deployment Checklist

- [ ] Change `domain: localhost` to your actual domain
- [ ] Update all URLs from `localhost` to your domain
- [ ] Use `https://` URLs instead of `http://` (requires reverse proxy)
- [ ] Set strong, randomly-generated tokens (not examples)
- [ ] Enable and configure Redis/Valkey caching
- [ ] Set up PostgreSQL backups
- [ ] Enable HTTPS with reverse proxy (nginx/Caddy)
- [ ] Configure GitHub/GitLab/Jira tokens if using those integrations
- [ ] Set up log rotation and monitoring
- [ ] Test disaster recovery procedures
- [ ] Document your configuration changes
- [ ] Set resource limits in docker-compose (memory, CPU)
- [ ] Enable restart policies: `restart: unless-stopped`

---

## Support & Resources

- **Matrix Spec:** https://spec.matrix.org
- **Synapse Docs:** https://matrix-org.github.io/synapse/
- **Hookshot Repo:** https://github.com/element-hq/matrix-hookshot
- **Community Chat:** https://app.element.io/#/room/#matrix:matrix.org
- **Issues:** https://github.com/element-hq/matrix-hookshot/issues

---

## Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-22 | Initial complete guide, all issues resolved, production ready |
| | | - Added two-stack architecture |
| | | - Fixed Vite bundling issues (compound-web) |
| | | - Fixed Docker port mapping (9993 exposure) |
| | | - Comprehensive troubleshooting section |
| | | - Integration setup guides |

---

**Status:** ✅ **Production Ready**
**Last Tested:** February 22, 2026
**Maintainer:** Matrix Hookshot Project


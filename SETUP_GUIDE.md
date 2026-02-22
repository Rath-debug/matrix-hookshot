# Matrix Hookshot - Complete Setup Guide

## Table of Contents
1. [Technology Stack](#technology-stack)
2. [Prerequisites](#prerequisites)
3. [Step 1: Generate Authentication Tokens](#step-1-generate-authentication-tokens)
4. [Step 2: Configure the Bridge](#step-2-configure-the-bridge)
5. [Step 3: Register with Synapse](#step-3-register-with-synapse)
6. [Step 4: Build and Run](#step-4-build-and-run)
7. [Step 5: Verify Setup](#step-5-verify-setup)
8. [Troubleshooting](#troubleshooting)

---

## Technology Stack

Matrix Hookshot requires the following technologies:

### Core Requirements
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 18.0+ | JavaScript runtime for the bridge |
| **Rust** | 1.70+ | For native modules and performance |
| **Docker** | 20.10+ | Container runtime (optional but recommended) |
| **Docker Compose** | 1.29+ | Container orchestration |

### Services
| Service | Purpose | Notes |
|---------|---------|-------|
| **Matrix Synapse** | Matrix homeserver | Required - processes Matrix events |
| **PostgreSQL** | Database | Required - stores Matrix data |
| **Redis** (optional) | Message queue & caching | Optional - improves performance |

### Build Tools
- **npm** or **yarn** - Package manager for Node.js
- **Cargo** - Rust package manager
- **Make** or equivalent build tool

---

## Prerequisites

Before starting, ensure you have:

### 1. Matrix Homeserver Running
```bash
# Matrix Synapse must be running
# Verify with:
curl http://localhost:8008/_matrix/client/versions
```

### 2. System Requirements
- **Linux/macOS/Windows with WSL2**
- **8GB+ RAM** (4GB minimum)
- **2+ CPU cores**
- **2GB+ free disk space**

### 3. Network Configuration
- Hookshot needs to be accessible to your Matrix homeserver
- Webhooks need to reach Hookshot at a stable URL
- Ports to expose:
  - **9001** - Webhooks & Widgets
  - **9993** - Matrix bridge port

---

## Step 1: Generate Authentication Tokens

Tokens are **required** to authenticate the bridge with your homeserver.

### Generate Secure Tokens

Run the following command to generate random tokens:

#### On Linux/macOS/WSL:
```bash
# Generate Application Service token (as_token)
openssl rand -base64 32

# Generate Homeserver token (hs_token)
openssl rand -base64 32
```

#### On Windows PowerShell:
```powershell
# Generate Application Service token
[Convert]::ToBase64String([System.Random]::new().GetBytes(32)) | powershell -NoProfile -Command {$input | Out-String}

# Alternatively, use:
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

**Example output:**
```
as_token: aBc123XyZ9aBc123XyZ9aBc123XyZ9aBc123XyZ9=
hs_token: XyZ9aBc123XyZ9aBc123XyZ9aBc123XyZ9aBc1=
```

**Save these tokens securely** - you'll need them in the next steps.

---

## Step 2: Configure the Bridge

### Edit `config.yml`

Update the configuration file with your generated tokens:

```yaml
bridge:
  domain: localhost  # Change to your homeserver domain
  url: http://synapse:8008  # URL of your Synapse homeserver
  port: 9993  # Port Hookshot listens on
  bindAddress: 0.0.0.0
  as_token: YOUR_AS_TOKEN_HERE  # ← Paste your generated as_token
  hs_token: YOUR_HS_TOKEN_HERE  # ← Paste your generated hs_token
  userId: "@hookshot:localhost"  # Change localhost to your domain

logging:
  level: debug
  colorize: true

passFile: /data/passkey.pem
listeners:
  - port: 9001
    bindAddress: 0.0.0.0
    resources:
      - widgets
      - webhooks

generic:
  enabled: true
  urlPrefix: http://localhost:9001/webhook/
  allowJsTransformationFunctions: true
  waitForComplete: true

widgets:
  publicUrl: http://localhost:9001/widgetapi/v1/static/
  roomSetupWidget:
    addOnInvite: true
  openIdOverrides:
    "localhost": "http://synapse:8008"
```

**Key fields to update:**
- `domain` - Your Matrix homeserver domain
- `url` - URL/IP where Synapse is accessible
- `as_token` - First generated token
- `hs_token` - Second generated token
- `userId` - Bot user ID on your homeserver

---

## Step 3: Register with Synapse

### Update `registration.yml`

**IMPORTANT:** The tokens in `registration.yml` must match exactly with `config.yml`

```yaml
id: matrix-hookshot
as_token: YOUR_AS_TOKEN_HERE  # ← Same as config.yml
hs_token: YOUR_HS_TOKEN_HERE  # ← Same as config.yml

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
    - regex: "#@hookshot:localhost"
      exclusive: true

sender_localpart: hookshot
url: "http://localhost:9993"  # Must match bridge.port in config.yml
rate_limited: false

de.sorunome.msc2409.push_ephemeral: true
push_ephemeral: true
org.matrix.msc3202: true
```

### Register with Synapse

1. **Copy registration.yml to Synapse config directory:**
```bash
cp registration.yml /path/to/synapse/app_service_registration.yaml
```

2. **Update Synapse's homeserver.yaml:**
```yaml
app_service_config_files:
  - app_service_registration.yaml
```

3. **Restart Synapse:**
```bash
docker-compose restart synapse
# or
systemctl restart matrix-synapse
```

---

## Step 4: Build and Run

### Option A: Using Docker Compose (Recommended)

**Important:** The Docker configuration has been optimized for:
- Extended network timeout (15 minutes) for dependency downloads
- Proper Vite CSS dependency resolution
- Git integration for commit info

```bash
# Build without cache (recommended for first build)
docker-compose build --no-cache

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f hookshot
```

**Monitor the build process:**
```bash
# Watch real-time logs (build takes 5-10 minutes)
docker-compose logs -f hookshot

# Check specific phases
docker-compose logs hookshot | grep -E "Rust|Typescript|vite|error"
```

**What you should see:**
```
1. Building Rust module (3-5 minutes)
2. Running rust-typescript definitions fix
3. Building Typescript layer (tsc)
4. Building web (vite build - 1-2 minutes)
5. Building final image
```

**If the build fails:**
```bash
# View full error
docker-compose logs --tail=100 hookshot

# Rebuild without cache
docker-compose build --no-cache
```

### Option B: Manual Setup

#### 1. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Rust toolchain (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### 2. Build the Project
```bash
npm run build
```

#### 3. Generate Passkey (if needed)
```bash
npm run generate-passkey
# This creates passkey.pem
```

#### 4. Run the Bridge
```bash
npm start
```

Or in development mode:
```bash
npm run dev
```

---

## Step 5: Verify Setup

### Check if Bridge is Running

```bash
# Check if port 9993 is listening (Matrix)
curl http://localhost:9993/_matrix/app/v1/users/@test:localhost

# Check if webhooks are accessible
curl http://localhost:9001/webhooks

# View logs
docker-compose logs hookshot
# or
npm run logs
```

### Test Bridge Connection

1. **Invite the bot to a room:**
```
/invite @hookshot:your-homeserver.com
```

2. **Check bot response:**
```
!hookshot help
```

### Expected Output
```
Bot should respond with available commands
```

If the bot doesn't respond:
- Check logs: `docker-compose logs hookshot`
- Verify tokens match in both files
- Ensure Synapse has restarted
- Check firewall/network rules

---

## Troubleshooting

### Issue 1: "Token missing" or Connection Refused

**Cause:** Tokens don't match between config.yml and registration.yml

**Solution:**
```bash
# 1. Generate new tokens (see Step 1)
# 2. Update BOTH files with same tokens
# 3. Restart services:
docker-compose restart
```

### Issue 2: Bridge Can't Connect to Synapse

**Cause:** Wrong homeserver URL or port

**Solution:**
```yaml
# In config.yml, verify:
bridge:
  url: http://synapse:8008  # or your actual IP/hostname
  domain: your-domain.com   # Your actual domain
```

### Issue 3: Bot User Not Recognized

**Cause:** Registration not loaded by Synapse

**Solution:**
```bash
# 1. Verify registration.yml copied to Synapse
# 2. Check homeserver.yaml includes app_service_config_files
# 3. Restart Synapse:
docker-compose down
docker-compose up -d
docker-compose logs synapse  # Check for errors
```

### Issue 4: Webhooks Not Accessible

**Cause:** Port 9001 not exposed or firewall blocking

**Solution:**
```bash
# Check if port is open
netstat -an | grep 9001
# or on Windows:
netstat -ano | findstr :9001

# Update firewall rules if needed
# Check docker-compose.yml exposes correct ports
```

### Issue 5: End-to-End Encryption Issues

**Cause:** Passkey not generated or corrupted

**Solution:**
```bash
# Regenerate passkey
npm run generate-passkey
npm run reset-crypto
docker-compose restart
```

### Issue 6: Database Connection Error

**Cause:** PostgreSQL not running or credentials wrong

**Solution:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Verify credentials in .env or config
# Check logs:
docker-compose logs postgres
```

### Issue 7: Build Fails - "Cannot resolve @vector-im/compound-design-tokens"

**Cause:** Vite is not properly pre-bundling the compound-web library and its dependencies

**Error:**
```
[vite]: Rollup failed to resolve import "@vector-im/compound-design-tokens/assets/web/icons/error-solid"
```

**Solution (Applied):** The `vite.config.mjs` has been updated to include compound-web in optimizeDeps:

```javascript
optimizeDeps: {
  include: ['@vector-im/compound-web', '@vector-im/compound-design-tokens'],
}
```

If you still encounter this error:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Build time:** 8-12 minutes (includes Rust compilation)

### Issue 8: Build Timeout - "Network request failed"

**Cause:** Yarn dependencies take longer than default 10-minute timeout

**Error:**
```
error Command failed with exit code 1
```

**Solution:** This has been fixed - Docker timeout increased to 15 minutes. If rebuilding:

```bash
# Force rebuild with extended timeouts
docker-compose build --no-cache --progress=plain

# Or build locally first
yarn install --network-timeout 900000
yarn build
```

---

## Environment Variables (.env)

Create a `.env` file for sensitive data:

```env
# Synapse Configuration
SYNAPSE_DOMAIN=localhost
SYNAPSE_URL=http://synapse:8008

# Database
POSTGRES_USER=synapse
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=synapse

# Bridge Tokens
AS_TOKEN=your_generated_as_token_here
HS_TOKEN=your_generated_hs_token_here

# Redis (optional)
REDIS_URL=redis://valkey:6379
```

Then reference in config:
```yaml
bridge:
  url: ${SYNAPSE_URL}
  as_token: ${AS_TOKEN}
  hs_token: ${HS_TOKEN}
```

---

## Next Steps

After successful setup:

1. **Configure Integrations:**
   - GitHub: [Setup Guide](docs/setup/github.md)
   - GitLab: [Setup Guide](docs/setup/gitlab.md)
   - Jira: [Setup Guide](docs/setup/jira.md)
   - OpenProject: [Setup Guide](docs/setup/openproject.md)

2. **Enable Advanced Features:**
   - End-to-Bridge Encryption
   - Custom Webhooks
   - Widgets

3. **Monitor:**
   - Check metrics: `http://localhost:9001/metrics`
   - Review logs regularly

---

## Support

- **Matrix Room:** [#hookshot:half-shot.uk](https://matrix.to/#/#hookshot:half-shot.uk)
- **Documentation:** [matrix-org.github.io/matrix-hookshot](https://matrix-org.github.io/matrix-hookshot)
- **GitHub Issues:** [matrix-org/matrix-hookshot](https://github.com/matrix-org/matrix-hookshot)

---

## Quick Reference

| Task | Command |
|------|---------|
| Generate tokens | `openssl rand -base64 32` |
| Start services | `docker-compose up -d` |
| View logs | `docker-compose logs -f hookshot` |
| Stop services | `docker-compose down` |
| Rebuild | `npm run build` |
| Reset crypto | `npm run reset-crypto` |
| Check status | `curl http://localhost:9993/_matrix/app/v1/users/@test:localhost` |


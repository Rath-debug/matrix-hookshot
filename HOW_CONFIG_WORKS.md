# How Config Files Work: Local vs Railway

## The Problem

When you deploy to Railway, how does the app know to use the right config?

```
config.yml (local development)
    vs
config.railway.production.yml (with environment variables)
```

## The Solution

The Dockerfile and startup script handle this automatically:

---

## Step-by-Step Flow

### 1️⃣ Local Development (Your Machine)

```
You run:
  node App/BridgeApp.js config.yml registration.yml

Files used:
  config.yml (hardcoded values for local testing)
  registration.yml (hardcoded values for local testing)

These files are in .gitignore - never committed
```

### 2️⃣ Docker Build (Building for Railway)

```dockerfile
# Dockerfile copies the PRODUCTION files
COPY config.railway.production.yml /bin/matrix-hookshot/config.railway.production.yml
COPY registration.railway.production.yml /bin/matrix-hookshot/registration.railway.production.yml

# These files contain ${VARIABLE} placeholders (safe to commit)
# Example:
#   as_token: ${MATRIX_AS_TOKEN}
#   hs_token: ${MATRIX_HS_TOKEN}
```

### 3️⃣ Container Startup (In Railway)

```bash
# docker-entrypoint.sh runs first
#!/bin/sh

# STEP A: Expand environment variables
envsubst < /bin/matrix-hookshot/config.railway.production.yml > /data/config.yml
#          ↓
#    Takes: as_token: ${MATRIX_AS_TOKEN}
#    Reads: MATRIX_AS_TOKEN=xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=
#    Outputs: as_token: xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=

envsubst < /bin/matrix-hookshot/registration.railway.production.yml > /data/registration.yml

# STEP B: Start application with expanded files
exec node /bin/matrix-hookshot/App/BridgeApp.js /data/config.yml /data/registration.yml
```

### 4️⃣ Application Runs

```
Hookshot starts with:
  /data/config.yml (with actual token values)
  /data/registration.yml (with actual token values)

The tokens came from Railway environment variables:
  MATRIX_AS_TOKEN=xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=
  MATRIX_HS_TOKEN=Z3v5i7o+TyUuQgVBK+xWQFqnngFJBjuc8Gct1w65wcA=
  ... (and other variables)
```

---

## File Summary

| File | Location | Contains | Purpose |
|------|----------|----------|---------|
| `config.yml` | `.gitignore` | Hardcoded values | Local development |
| `registration.yml` | `.gitignore` | Hardcoded values | Local development |
| `config.railway.production.yml` | ✅ Git repo | `${VARIABLE}` placeholders | Production template |
| `registration.railway.production.yml` | `.gitignore` OR use vars | `${VARIABLE}` placeholders | Production registration |
| `docker-entrypoint.sh` | ✅ Git repo | `envsubst` expansion logic | Startup script |
| `Dockerfile` | ✅ Git repo | `COPY` production files | Build instructions |

---

## How Railway Injects Secrets

```
You set in Railway Dashboard:
┌─────────────────────────────────────────┐
│ Variables                               │
├─────────────────────────────────────────┤
│ MATRIX_AS_TOKEN=xCQMUY7OiTqdXFTLP...  │
│ MATRIX_HS_TOKEN=Z3v5i7o+TyUuQgVB...   │
│ MATRIX_DOMAIN=synapse-production...   │
│ ... (12 variables total)                │
└─────────────────────────────────────────┘
         ↓
    Container starts
         ↓
    docker-entrypoint.sh reads:
    - Railway environment variables
    - Template files with ${VAR}
         ↓
    envsubst replaces ${VAR} with actual values
         ↓
    /data/config.yml (fully expanded, with secrets)
    /data/registration.yml (fully expanded, with secrets)
         ↓
    Application reads the expanded files
    Bridge starts successfully ✅
```

---

## Why This Design?

### ✅ Benefits

1. **No secrets in git**
   - Template files have `${VARIABLE}` placeholders
   - Safe to commit `config.railway.production.yml`
   - Secrets stay in Railway's vault

2. **Local development works**
   - You use `config.yml` locally with hardcoded values for testing
   - Never committed (in .gitignore)

3. **Production is secure**
   - Environment variables injected at runtime
   - No hardcoded values in deployed app
   - Easy to rotate secrets (just update Railway variables)

4. **Railway works automatically**
   - Docker image contains templates
   - Startup script expands variables
   - App gets fully configured

---

## What You Need to Do

### 1. Set Railway Environment Variables

In **Railway Dashboard → Your Project → Variables**:

```
MATRIX_DOMAIN=synapse-production-ea3f.up.railway.app
MATRIX_URL=https://synapse-production-ea3f.up.railway.app
MATRIX_USER_ID=@hookshot:synapse-production-ea3f.up.railway.app
MATRIX_AS_TOKEN=xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=
MATRIX_HS_TOKEN=Z3v5i7o+TyUuQgVBK+xWQFqnngFJBjuc8Gct1w65wcA=
WEBHOOK_URL_PREFIX=https://hookshoot-bot.railway.app/webhook/
WIDGET_PUBLIC_URL=https://hookshoot-bot.railway.app/widgetapi/v1/static/
LOG_LEVEL=info
LOG_COLORIZE=false
BRIDGE_PORT=9993
BRIDGE_BIND_ADDRESS=0.0.0.0
HOOKSHOT_PUBLIC_URL=https://hookshoot-bot.railway.app
```

### 2. Commit Files to Git

```bash
git add config.railway.production.yml
git add registration.railway.production.yml.example
git add docker-entrypoint.sh
git add Dockerfile
git commit -m "Update for environment variable configuration"
git push
```

### 3. Railway Automatically Deploys

```
GitHub webhook triggers
    ↓
Railway builds Docker image (uses Dockerfile)
    ↓
Railway starts container (reads environment variables)
    ↓
docker-entrypoint.sh expands templates
    ↓
Hookshot runs with your config ✅
```

---

## Testing Locally

```bash
# Set test environment variables
export MATRIX_DOMAIN=synapse-production-ea3f.up.railway.app
export MATRIX_URL=https://synapse-production-ea3f.up.railway.app
export MATRIX_AS_TOKEN=test-token
export MATRIX_HS_TOKEN=test-token
... (set all 12 variables)

# Expand config locally
envsubst < config.railway.production.yml > /tmp/test-config.yml

# View result
cat /tmp/test-config.yml

# Should show:
# as_token: test-token
# (not ${MATRIX_AS_TOKEN})
```

---

## Troubleshooting

### Problem: "Cannot find module" or config errors
→ Check Railway logs
→ Make sure all environment variables are set
→ Verify variable names match exactly

### Problem: Token mismatch errors
→ Check Railway variables have correct tokens
→ Verify tokens match registration.yml on Synapse
→ Restart Synapse

### Problem: envsubst not found
→ Make sure `gettext-base` is installed in Dockerfile
→ Check Dockerfile has: `apt-get install -y openssl ca-certificates gettext-base`

---

**Summary**: The Dockerfile + startup script + environment variables work together to automatically inject your secrets into the config files when the container starts, without storing them in git. Magic! ✨

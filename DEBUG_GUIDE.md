# Matrix Hookshot Bridge - Debug Guide

A comprehensive guide to troubleshooting your Railway deployment of Matrix Hookshot.

## Table of Contents

1. [Accessing Logs](#accessing-logs)
2. [Build Logs vs Deploy Logs](#build-logs-vs-deploy-logs)
3. [Common Errors & Solutions](#common-errors--solutions)
4. [Monitoring Deployment Status](#monitoring-deployment-status)
5. [Verifying Bridge Connectivity](#verifying-bridge-connectivity)
6. [Configuration Issues](#configuration-issues)

---

## Accessing Logs

### Option 1: Railway Dashboard (Web UI)

1. Go to https://railway.com/dashboard
2. Click on your project: **"MAS and Synapse"**
3. Click on **"matrix-hookshot"** service
4. Click **"Logs"** tab (right side)
5. View real-time logs as the container runs

### Option 2: Railway CLI

```bash
# View live logs (streaming)
railway logs --tail

# View last 100 lines
railway logs -n 100

# View logs from specific timestamp
railway logs --since "2026-03-03 03:00:00"
```

### Option 3: Docker Container (if SSH access available)

```bash
# SSH into Railway container
railway shell

# Inside container, view logs
cat /data/config.railway.production.yml
cat /data/registration.yml
```

---

## Build Logs vs Deploy Logs

### Build Logs
**When to check**: When Docker image fails to build

**Location**: Railway Dashboard → Deployments tab → Click deployment → "Build logs"

**What it shows**:
- Docker image compilation
- Dependency installation (yarn install)
- TypeScript compilation (yarn build)
- Asset copying

**Example**:
```
[builder  7/12] RUN yarn --ignore-scripts --pure-lockfile --network-timeout 900000
[builder 11/12] RUN yarn install --network-timeout 900000
[builder 12/12] RUN yarn build
[stage-1 11/15] COPY config.railway.production.yml ...
  ✅ Build succeeded
```

**Common build errors**:
- `failed to compute cache key: failed to calculate checksum... not found`
  - Solution: Missing files in git (check .gitignore)
- `RUN yarn build` fails
  - Solution: Check Rust/Node.js versions, run locally first

---

### Deploy Logs
**When to check**: When app starts but crashes or behaves incorrectly

**Location**: Railway Dashboard → "Logs" tab (default view)

**What it shows**:
- Container startup
- Environment variable expansion (docker-entrypoint.sh)
- Application initialization
- Runtime errors/warnings

**Example**:
```
Generating passkey.pem...
Expanding environment variables in templates...
Starting matrix-hookshot bridge...
INFO 03:39:02:747 [Config] Loading config from /data/config.railway.production.yml
INFO 03:39:02:825 [Bridge] Starting up
INFO 03:39:02:794 [ListenerService] Listening on http://0.0.0.0:9001 for webhooks, widgets
  ✅ Bridge started successfully
```

**Critical lines to look for**:
- `Bridge ready` or `[Bridge] Starting up` = Success ✅
- `ERROR` = App crashed ❌
- `WARN` = Non-critical warnings ⚠️

---

## Common Errors & Solutions

### Error 1: `ENOENT: no such file or directory, open '/data/config.railway.production.yml'`

**Cause**: Config file not being expanded by `docker-entrypoint.sh`

**Solution**:
1. Check `docker-entrypoint.sh` is executable in Dockerfile
2. Verify `config.railway.production.yml` exists in git
3. Verify environment variables are set in Railway

**Check**:
```bash
railway shell
cat /data/config.railway.production.yml
# Should show expanded config, not ${VAR} placeholders
```

---

### Error 2: `YAMLParseError: Plain value cannot start with reserved character @`

**Cause**: YAML values like `@hookshot:...` not quoted in template

**Solution**: All variables must be quoted in config files
```yaml
# ❌ Wrong
userId: ${MATRIX_USER_ID}

# ✅ Correct
userId: "${MATRIX_USER_ID}"
```

**Check**:
```bash
grep -n 'userId:' config.railway.production.yml
# Should show: userId: "${MATRIX_USER_ID}"
```

---

### Error 3: `MaxRetriesPerRequestError` from Redis

**Cause**: Redis not configured but config requires it

**Solution**: Either:

**Option A**: Disable Redis in config
```yaml
# Comment out cache section
# cache:
#   redisUri: redis://localhost:6379
```

**Option B**: Add Redis to Railway
1. Railway Dashboard → "Create" button
2. Add Database → Redis
3. Set `REDIS_URL` environment variable on matrix-hookshot service

**Check**:
```bash
railway shell
redis-cli ping
# If Redis is available, responds with: PONG
```

---

### Error 4: Bridge starts but doesn't respond to invites

**Cause 1**: Not registered with Synapse
- Solution: Contact Synapse admin, provide `registration.railway.production.yml`

**Cause 2**: Wrong tokens in Synapse registration
- Solution: Verify tokens match:
  - `MATRIX_AS_TOKEN` in Railway env = `as_token` in Synapse registration
  - `MATRIX_HS_TOKEN` in Railway env = `hs_token` in Synapse registration

**Cause 3**: Wrong registration URL
- Solution: Verify in Synapse's `homeserver.yaml`:
  ```yaml
  app_service_config_files:
    - /path/to/registration.railway.production.yml
  ```

**Check**:
```bash
# Test if bridge is running
curl https://hookshoot-bot.railway.app/
# Should get a response (not timeout)

# Check if JSON API is accessible
curl https://hookshoot-bot.railway.app/api/v1/health
```

---

## Monitoring Deployment Status

### Real-time Status

```bash
# Check current deployment status
railway status

# Watch for crashes (restarts)
railway logs --tail
# Look for "Starting Container" repeating = infinite restart loop
```

### Health Checks

```bash
# From outside Railway:
curl -v https://hookshoot-bot.railway.app/

# From Railway shell:
railway shell
curl -v http://localhost:9001/
```

### Environment Variables

```bash
# Verify all variables are set
railway variables

# Should show:
# MATRIX_AS_TOKEN
# MATRIX_HS_TOKEN
# MATRIX_DOMAIN
# MATRIX_URL
# etc.
```

---

## Verifying Bridge Connectivity

### Step 1: Bridge is Running

```
Check logs for:
✅ "Listening on http://0.0.0.0:9001" - Webhooks/widgets port
✅ "Listening on http://0.0.0.0:9002" - Metrics port
✅ "[Bridge] Starting up" - Bridge initialization started
```

### Step 2: Bridge is Registered (Do this after Synapse admin registers)

```
Check logs for:
✅ "[Appservice] Loaded registration" - Registration loaded
✅ "[Bridge] Entity filter" - User/alias filtering active
✅ "[Bridge] Encryption" - E2EE support enabled
```

### Step 3: Can Connect from Synapse

```bash
# From Synapse server:
curl -X GET \
  -H "Authorization: Bearer {MATRIX_HS_TOKEN}" \
  http://hookshoot-bot.railway.app/api/v1/health

# Should return: 200 OK
```

### Step 4: Can Invite Bot to Room (In Matrix client)

1. Open any room
2. Click "Invite"
3. Type: `@hookshot:synapse-production-ea3f.up.railway.app`
4. Check Synapse logs for successful user creation
5. Bot should join room

**In Hookshot logs, you should see**:
```
INFO [Bridge] ... received event from @user:synapse...
INFO [Appservice] ... created virtual user @_github_...
```

---

## Configuration Issues

### Issue: Variables Not Expanding

**Check**:
```bash
railway shell
env | grep MATRIX_
# Should show all environment variables

cat /data/config.railway.production.yml | head -20
# Should show expanded values, NOT ${VAR} placeholders
```

**Fix**:
1. Verify Railway environment variables are set
2. Re-run docker-entrypoint.sh manually:
   ```bash
   railway shell
   bash -x /docker-entrypoint.sh
   ```
3. Check for shell script errors

---

### Issue: wrong passkey.pem location

**Error**: `ENOENT: no such file or directory, open './passkey.pem'`

**Check**:
```yaml
# config.railway.production.yml should have:
passFile: /data/passkey.pem  # ✅ Absolute path

# NOT:
passFile: ./passkey.pem      # ❌ Relative path
```

**Verify**:
```bash
railway shell
ls -la /data/passkey.pem
# Should exist and be readable
```

---

### Issue: Permissions Warnings

**Log**:
```
WARN [Config] You have not configured any permissions for the bridge,
which by default means all users on synapse... have admin levels of control
```

**This is OK for development**, but for production add permissions to `config.railway.production.yml`:

```yaml
# Add to config
matrix:
  # ... existing settings ...
  permissions:
    "synapse-production-ea3f.up.railway.app":
      # All users
      "@*:synapse-production-ea3f.up.railway.app": "user"
      # Only admins get full control
      "@admin:synapse-production-ea3f.up.railway.app": "admin"
```

---

## Emergency Debugging

### Restart the Container

```bash
# Via Railway dashboard:
# → Deployments → Three dots → Restart

# Via CLI:
railway up --force-rebuild
```

### View Full Config After Expansion

```bash
railway shell
cat /data/config.railway.production.yml

# Pipe to file to examine:
cat /data/config.railway.production.yml > /tmp/config-dump.yml
wc -l /tmp/config-dump.yml
```

### Check Application State

```bash
railway shell

# Is node running?
ps aux | grep node

# Check open ports
netstat -tlnp | grep LISTEN

# Check disk space
df -h /data

# Check token file
ls -la /data/passkey.pem
file /data/passkey.pem  # Should be RSA key
```

### Enable Debug Logging

Add to `config.railway.production.yml`:
```yaml
logging:
  level: debug    # Changed from 'info'
  colorize: false
```

Then redeploy:
```bash
git add config.railway.production.yml
git commit -m "DEBUG: Enable debug logging"
git push
railway up
```

---

## Quick Reference

| Issue | Check | Fix |
|-------|-------|-----|
| Build fails | Build logs | Check .gitignore, git tracked files |
| App crashes immediately | Deploy logs first 20 lines | Check docker-entrypoint.sh errors |
| YAML parse error | Look for unquoted `@` or `:` | Add quotes: `"${VAR}"` |
| Can't connect to Redis | Search for `ECONNREFUSED` | Disable cache or add Redis service |
| Bot doesn't respond to invites | Check Synapse registration | Verify tokens match, registration path correct |
| High memory usage | Check logs for memory warnings | May need Redis, check listeners config |

---

## Getting Help

If you're still stuck, provide:

1. **Full error message** from logs
2. **Last 50 log lines** before error appeared
3. **Environment variables** (hide the actual token values):
   ```bash
   railway variables | head -20
   ```
4. **Config file first 30 lines** (redact secrets):
   ```bash
   head -30 /data/config.railway.production.yml
   ```
5. **Deployment ID**: From Railway dashboard URL
6. **When it started failing**: Was it working before?

---

**Document version**: 1.0
**Last updated**: March 3, 2026
**For**: Matrix Hookshot on Railway

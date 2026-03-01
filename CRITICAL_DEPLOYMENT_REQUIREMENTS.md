# Critical Deployment Requirements - Quick Reference

These 5 points are **non-negotiable** for successful Hookshoot deployment. Each one can cause complete failure if missed.

---

## 1. Registration URL Must Match Railway Public URL

### The Problem
Synapse needs to send HTTP requests TO Hookshoot. If the URL is wrong, Synapse can't find the bot.

### What It Looks Like
```yaml
# registration.railway.production.yml
url: "https://hookshoot-bot.railway.app"
```

⚠️ This MUST match your exact Railway URL

### Verification
```bash
# From your Synapse server:
curl -v https://hookshoot-bot.railway.app

# Expected: HTTP response (any status is OK)
# Error: Cannot resolve hostname = Wrong/unreachable URL
```

### Common Mistakes
- ❌ `url: "https://matrix-hookshot-production.up.railway.app"` (old name)
- ❌ `url: "http://hookshoot-bot.railway.app"` (missing https)
- ❌ `url: "localhost:9993"` (not accessible from Synapse)
- ✅ `url: "https://hookshoot-bot.railway.app"` (correct)

### If Wrong
```
Result: Bridge never activates, Synapse sees Connection refused
Fix: Update url in registration.yml, restart Synapse
```

---

## 2. Must Have SSH/File Access to Synapse Server

### The Problem
You CANNOT deploy Hookshoot without being able to edit your Synapse's `homeserver.yaml`

### What You Need
- SSH access to Synapse server: `ssh your-user@synapse-server.com`
- Ability to edit files: `nano /path/to/homeserver.yaml`
- Ability to restart Synapse: `systemctl restart matrix-synapse` or `docker-compose restart synapse`

### Verification
```bash
# Test SSH access:
ssh your-user@your-synapse-server

# Test file access:
cat /path/to/homeserver.yaml

# Test restart capability:
sudo systemctl restart matrix-synapse

# Check logs:
journalctl -u matrix-synapse -f
```

### If You Don't Have Access
```
❌ STOP - Do not proceed with deployment
   Contact your Synapse administrator
   Get SSH access before deploying Hookshoot
```

### Typical Access Methods
- **Your Own Server**: You have full SSH access
- **VPS (Linode, DigitalOcean)**: You have root SSH access
- **Heroku/Railway Synapse**: May not have SSH - contact provider
- **Docker**: Need access to Docker host where Synapse runs

---

## 3. Missing Railway Volume = Data Loss on Every Restart

### The Problem
Railway containers restart frequently. Without a volume, you lose:
- Room configuration links
- Bridge authorization tokens
- Custom settings

Every restart = manually re-link all bridges

### What It Looks Like (CORRECT)
```
Railway Dashboard → Service → Storage
Mount Path: /data/storage
Size: 1GB
Status: ✅ Active
```

### What Goes Wrong (WRONG)
- ❌ No storage configured
- ❌ Storage at wrong path (`/data` instead of `/data/storage`)
- ❌ Storage too small (< 1GB)
- ❌ Volume accidentally deleted

### Verification
```bash
# In Railway logs, look for:
✓ Volume mounted at /data/storage

# If missing:
✗ Cannot write to /data/storage
✗ Permission denied
```

### Recovery
If you lose data:
```bash
# You must re-link every bridge
@hookshot: !rooms bridge
# Then re-authorize each integration (GitHub, GitLab, etc.)
```

---

## 4. Environment Variables vs Hardcoded Secrets

### The Problem
Never commit tokens to git. They're in version control forever.

### What It Looks Like (CORRECT)
```yaml
# config.yml uses placeholders
bridge:
  as_token: ${MATRIX_AS_TOKEN}
  hs_token: ${MATRIX_HS_TOKEN}
```

```
# Railway Variables (NOT in git)
MATRIX_AS_TOKEN=xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=
MATRIX_HS_TOKEN=Z3v5i7o+TyUuQgVBK+xWQFqnngFJBjuc8Gct1w65wcA=
```

### What Goes Wrong (WRONG)
```yaml
# NEVER in config.yml:
bridge:
  as_token: xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=
  hs_token: Z3v5i7o+TyUuQgVBK+xWQFqnngFJBjuc8Gct1w65wcA=
```

Then committed to git:
```bash
git commit -m "Add Hookshot config"
git push  # ❌ TOKENS NOW EXPOSED FOREVER
```

### Verification
```bash
# Check git history for tokens:
git log --all --grep="token"
git log -S "xCQMUY7OiTqdXFTLP" -- .

# Check current files:
grep -r "xCQMUY7OiTqdXFTLP" .

# Should only appear in:
# ✅ Railway environment variables
# ✅ registration.yml (which should NOT be committed)
# ❌ config.yml (should use ${VARIABLE})
```

### If Exposed
```
❌ URGENT: Rotate all tokens immediately
   New as_token: (generate new)
   New hs_token: (generate new)
   Update registration with Synapse
   Restart Synapse
   Update Railway environment variables
```

---

## 5. Listener Port Must Match Railway PORT Variable

### The Problem
Railway provides a `PORT` environment variable. Your listener must use that exact port.

### What It Looks Like (CORRECT)
```yaml
# config.yml
listeners:
  - port: 9993          # ← Matches PORT variable below
    bindAddress: 0.0.0.0
    resources:
      - webhooks
      - widgets
```

```
# Railway environment variable
PORT=9993              # ← Matches config.yml listener port
```

### What Goes Wrong (WRONG)
```yaml
# config.yml says port 9993
listeners:
  - port: 9993

# But Railway PORT=8080
# Result: Railway routes to port 8080
#         Hookshot listens on 9993
#         Everything fails: Connection refused
```

### The Issue
Railway's load balancer uses the `PORT` variable. If it doesn't match your listener:
- Railway routes traffic to wrong port
- Your app appears offline
- Synapse can't reach the bridge

### Verification
```bash
# Check Railway environment:
# Dashboard → Service → Variables
# PORT=9993

# Check config.yml:
grep -A2 "listeners:" config.railway.production.yml
# Should show: port: 9993

# Check logs after deployment:
# Should show: "Listening on port 9993"
```

### If Wrong
```
Error in logs:
  Failed to bind to port 8080
  or
  Listening on port 9993 (but Railway routes to 8080)

Fix:
  1. Make sure both PORT and config match
  2. Redeploy in Railway
  3. Check logs: "Listening on port 9993"
```

---

## Pre-Deployment Checklist Template

Print this and check each item:

```
CRITICAL REQUIREMENTS:
☐ 1. SSH access to Synapse server confirmed
☐ 2. registration.yml url matches Railway URL exactly
☐ 3. Railway Volume configured at /data/storage
☐ 4. Secrets in Railway Variables (not in git)
☐ 5. PORT=9993 matches config.yml listener port

BEFORE SYNAPSE REGISTRATION:
☐ Hookshoot deployed to Railway (logs show "Listening on port 9993")
☐ Can curl Hookshoot: https://hookshoot-bot.railway.app
☐ All environment variables set in Railway
☐ All tokens match (same in config, registration, and Railway vars)

SYNAPSE REGISTRATION:
☐ registration.yml copied to Synapse server
☐ homeserver.yaml includes registration file path
☐ Synapse restarted: systemctl restart matrix-synapse
☐ Synapse logs show: "Loaded application service: matrix-hookshot"

VERIFICATION:
☐ Hookshot logs show: "Incoming request from homeserver"
☐ Can invite @hookshot to test room
☐ Bot successfully joined room
```

---

## Decision Tree: Can I Deploy?

```
START
  ↓
Do you have SSH access to Synapse? → NO → STOP, get access first
  ├─ YES ↓
Is your Synapse URL publicly accessible? → NO → STOP, fix network
  ├─ YES ↓
Will you use environment variables for secrets? → NO → STOP, use Railway vars
  ├─ YES ↓
Will you configure Railway Volume? → NO → STOP, will lose data
  ├─ YES ↓
Do your listener port and PORT variable match? → NO → STOP, make them match
  ├─ YES ↓
Is registration.yml url exactly your Railway URL? → NO → STOP, update it
  ├─ YES ↓
  ✅ PROCEED TO DEPLOYMENT
```

---

## Emergency Rollback

If deployment fails:

```bash
# 1. Stop the Hookshot service
Railway Dashboard → Service → Deployments → previous version → Redeploy

# 2. Remove it from Synapse
SSH to Synapse
  nano /path/to/homeserver.yaml
  # Remove or comment out hookshot registration
  systemctl restart matrix-synapse

# 3. Investigate
  # Check Railway logs for errors
  # Check port binding: netstat -tlnp | grep 9993
  # Check tokens match: grep "token" config.yml registration.yml
  # Verify URL: curl -v https://hookshoot-bot.railway.app
```

---

**Last Updated**: March 2, 2026
**Status**: Critical requirements guide for production deployment

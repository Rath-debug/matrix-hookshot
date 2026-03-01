# Environment Variables & Secrets Management

## Files Overview

### ✅ SAFE TO COMMIT (No Secrets)
- `config.railway.production.yml` - Uses `${VARIABLE}` placeholders
- `config.railway.production.yml.example` - Template file showing structure

### ❌ NEVER COMMIT (Contains/References Secrets)
- `registration.railway.production.yml` - Contains sensitive tokens
- `config.yml` - Local development config
- `registration.yml` - Local development registration

These files are in `.gitignore`:
```ignore
config.yml
registration.yml
registration.*.yml
config.*.production.yml
*.pem
*.cer
```

---

## How It Works

### 1. Development Flow

**Local Testing** (uses `config.yml` and `registration.yml`):
```bash
# These files are in .gitignore
# You can have any secrets here - they won't be committed
config.yml  # Has hardcoded tokens for local testing
registration.yml  # Local registration
```

**Deployed to Railway** (uses environment variables):
```bash
# Railway reads environment variables
MATRIX_DOMAIN=synapse-production-ea3f.up.railway.app
MATRIX_AS_TOKEN=<secure-token>
MATRIX_HS_TOKEN=<secure-token>
...

# config.railway.production.yml references these variables
as_token: ${MATRIX_AS_TOKEN}  # ← Injected at runtime
hs_token: ${MATRIX_HS_TOKEN}  # ← Injected at runtime
```

### 2. Configuration Files

```
Your Git Repository (public or private)
├── config.railway.production.yml ✅ (env variables, safe to commit)
├── config.railway.production.yml.example ✅ (template, safe to commit)
├── registration.railway.production.yml.example ✅ (template, safe to commit)
├── .gitignore (blocks these files)
├── config.yml ❌ (in .gitignore, secrets only local)
├── registration.yml ❌ (in .gitignore, secrets only local)
└── registration.railway.production.yml ❌ (in .gitignore OR use env vars)
```

### 3. Synapse Server (NOT in git)

On your Synapse server:
```bash
/path/to/synapse/
├── homeserver.yaml (points to registration file)
└── appservices/
    └── hookshot-registration.yml (NEVER from git, manual upload)
```

---

## Environment Variables for Railway

Set these in **Railway Dashboard → Variables**:

```
# Matrix Homeserver
MATRIX_DOMAIN=synapse-production-ea3f.up.railway.app
MATRIX_URL=https://synapse-production-ea3f.up.railway.app
MATRIX_USER_ID=@hookshot:synapse-production-ea3f.up.railway.app

# Authentication (GENERATED TOKENS - KEEP SECURE)
MATRIX_AS_TOKEN=xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=
MATRIX_HS_TOKEN=Z3v5i7o+TyUuQgVBK+xWQFqnngFJBjuc8Gct1w65wcA=

# Public URLs
HOOKSHOT_PUBLIC_URL=https://hookshoot-bot.railway.app
WEBHOOK_URL_PREFIX=https://hookshoot-bot.railway.app/webhook/
WIDGET_PUBLIC_URL=https://hookshoot-bot.railway.app/widgetapi/v1/static/

# Bridge Configuration
BRIDGE_PORT=9993
BRIDGE_BIND_ADDRESS=0.0.0.0

# Logging
LOG_LEVEL=info
LOG_COLORIZE=false
```

Railway injects these at runtime → Variables are replaced in `${...}` placeholders

---

## Security Principles

### ✅ DO THIS

1. **Use environment variables for secrets**
   ```yaml
   as_token: ${MATRIX_AS_TOKEN}
   hs_token: ${MATRIX_HS_TOKEN}
   ```

2. **Commit template files (.example)**
   ```bash
   git add config.railway.production.yml.example
   git add registration.railway.production.yml.example
   ```

3. **Use .gitignore to prevent accidents**
   ```ignore
   config.yml
   registration.yml
   registration.*.yml
   config.*.production.yml
   ```

4. **Rotate tokens regularly**
   - Generate new tokens every 3-6 months
   - Update Railway variables
   - Update registration.yml on Synapse
   - Restart both services

5. **Store secrets in Railway**
   - Never in your local `.env` file
   - Never in git history
   - Only in Railway's secure vault

### ❌ DON'T DO THIS

1. **Hardcode tokens in config files**
   ```yaml
   ❌ as_token: xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=
   ```

2. **Commit secrets to git**
   ```bash
   ❌ git add config.railway.production.yml
   ❌ git add registration.railway.production.yml
   ```

3. **Use .env files in production**
   Use Railway's environment variable system instead

4. **Share tokens in messages/code reviews**
   Rotate immediately if exposed

5. **Use weak tokens**
   Use cryptographically random tokens (32+ bytes)

---

## If You Accidentally Commit Secrets

### Immediate Actions

1. **Don't panic** - Rotate the tokens ASAP

2. **Generate new tokens**
   ```powershell
   # Run the setup script again
   powershell -ExecutionPolicy Bypass -File scripts\railway-setup.ps1
   ```

3. **Update everywhere**
   - Railway environment variables (new tokens)
   - registration.yml on Synapse (new tokens)
   - Restart Synapse
   - Restart Hookshot on Railway

4. **Remove from git history**
   ```bash
   # If pushed to public repo - assume tokens are compromised
   # Rotate immediately (done above)

   # Rewrite history (risky, only if private repo)
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch config.railway.production.yml' \
     -- --all
   git push --force --all
   ```

5. **Monitor**
   - Check auth logs for suspicious access
   - Review recent room activity
   - Check webhook logs for unauthorized requests

---

## File Purposes

| File | Purpose | Commit? | Contains Secrets? |
|------|---------|---------|-------------------|
| `config.yml` | Local development | ❌ No | ✅ Yes (hardcoded) |
| `registration.yml` | Local development | ❌ No | ✅ Yes (hardcoded) |
| `config.railway.production.yml` | Production config | ✅ Yes | ❌ No (uses vars) |
| `config.railway.production.yml.example` | Template reference | ✅ Yes | ❌ No (example) |
| `registration.railway.production.yml` | Production registration | ❌ No | ✅ Yes (tokens) |
| `registration.railway.production.yml.example` | Template reference | ✅ Yes | ❌ No (example) |

---

## Complete Deployment Checklist

- [ ] Generated new tokens (AS_TOKEN, HS_TOKEN)
- [ ] Added all environment variables to Railway
- [ ] `config.railway.production.yml` has `${VARIABLE}` placeholders (not hardcoded)
- [ ] `registration.railway.production.yml` is in `.gitignore`
- [ ] `.gitignore` includes `registration.*.yml` and `config.*.production.yml`
- [ ] No hardcoded tokens in any committed files
- [ ] git status shows no secrets were accidentally staged
- [ ] Synapse received the registration.yml manually (via scp or copy)
- [ ] Synapse restarted with new registration file
- [ ] Hookshot deployed and logs show successful authentication
- [ ] Tokens rotated every 3-6 months as scheduled

---

**Last Updated**: March 2, 2026
**Status**: Production-ready security practices

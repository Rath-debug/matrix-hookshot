# Using Environment Variables with matrix-hookshot on Railway

## Overview

Your `config.railway.yml` uses environment variable substitution with the format `${VAR_NAME}` or `${VAR_NAME:-default}`.

This guide explains how to manage these environment variables for Railway deployment.

## Files Involved

- **`.env.example`** - Template showing all available environment variables
- **`config.railway.yml`** - Configuration that reads from environment variables
- **Railway Dashboard** - Where variables are actually set and stored

## How to Use

### Option 1: Using .env File Locally (Testing)

If you want to test locally with Docker:

1. **Copy the template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your values:**
   ```
   MATRIX_DOMAIN=matrix.example.com
   MATRIX_URL=https://matrix.example.com
   MATRIX_USER_ID=@hookshot:matrix.example.com
   MATRIX_AS_TOKEN=your_token_here
   ... etc
   ```

3. **Run locally with environment:**
   ```bash
   # Docker Compose
   docker-compose --env-file .env up

   # Or direct Node.js
   source .env  # Linux/Mac
   set -a; source .env; set +a  # Bash
   npm start
   ```

### Option 2: Railway Dashboard (Recommended for Production)

**Never commit `.env` with secrets to Git!**

Instead, add variables directly in Railway:

1. **Go to Railway Dashboard**
2. **Select your project**
3. **Click "Hookshot" service**
4. **Click "Variables"**
5. **Add each variable from `.env.example`:**
   - Copy the variable name (e.g., `MATRIX_DOMAIN`)
   - Enter the value for your setup
   - Click "Add"

6. **Required variables** (without these, the app won't start):
   - `MATRIX_DOMAIN`
   - `MATRIX_URL`
   - `MATRIX_USER_ID`
   - `MATRIX_AS_TOKEN`
   - `MATRIX_HS_TOKEN`
   - `WEBHOOK_URL_PREFIX`
   - `WIDGET_PUBLIC_URL`

7. **Optional variables** (have defaults if not set):
   - `LOG_LEVEL` (defaults to `info`)
   - `LOG_COLORIZE` (defaults to `false`)
   - `GENERIC_ENABLED` (defaults to `true`)
   - etc.

8. **Click "Redeploy"** for changes to take effect

## Environment Variable Reference

### Required for Bridge Operation
```
MATRIX_DOMAIN             Your Matrix homeserver domain
MATRIX_URL                Your Matrix homeserver public URL
MATRIX_USER_ID            Bridge user ID (@hookshot:your-domain)
MATRIX_AS_TOKEN           Generated token (32 bytes, base64)
MATRIX_HS_TOKEN           Generated token (32 bytes, base64)
WEBHOOK_URL_PREFIX        Your Railway app webhook endpoint
WIDGET_PUBLIC_URL         Your Railway app widget endpoint
```

### Logging (Optional)
```
LOG_LEVEL                 debug | info | warn | error (default: info)
LOG_COLORIZE              true | false (default: false)
```

### Bridge Settings (Optional)
```
BRIDGE_PORT               Port to listen on (default: 9993)
BRIDGE_BIND_ADDRESS       Bind address (default: 0.0.0.0)
NODE_ENV                  development | production (default: production)
```

### Integrations (Optional)
```
GENERIC_ENABLED           Enable generic webhooks (default: true)
GITHUB_ENABLED            Enable GitHub integration (default: false)
GITLAB_ENABLED            Enable GitLab integration (default: false)
JIRA_ENABLED              Enable JIRA integration (default: false)
FIGMA_ENABLED             Enable Figma integration (default: false)
OPENPROJECT_ENABLED       Enable OpenProject integration (default: false)
```

### Advanced (Optional)
```
MEDIA_ENCRYPTION_URL      URL for media encryption
REDIS_URI                 Redis connection string (if using Redis)
DB_ENGINE                 Database engine (default: sqlite)
DB_CONNECTION_STRING      Database connection string
WIDGET_TITLE              Custom widget title
```

## Generating Tokens

Generate secure tokens for `MATRIX_AS_TOKEN` and `MATRIX_HS_TOKEN`:

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | % {[byte](Get-Random -min 0 -max 256)}))
```

Or use the setup script:
```bash
# Linux/Mac
bash scripts/railway-setup.sh

# Windows
powershell -ExecutionPolicy Bypass -File scripts/railway-setup.ps1
```

## Security Best Practices

### DO NOT:
- ❌ Commit `.env` file to Git
- ❌ Commit `MATRIX_AS_TOKEN` or `MATRIX_HS_TOKEN` to Git
- ❌ Share tokens in chat or emails
- ❌ Use the same tokens for multiple deployments

### DO:
- ✅ Use Railway's environment variable storage
- ✅ Generate unique tokens for each deployment
- ✅ Rotate tokens quarterly
- ✅ Keep `.env` files in `.gitignore`
- ✅ Use a password manager to store tokens

## .gitignore Configuration

Ensure your `.gitignore` includes:
```
# Environment variables
.env
.env.local
.env.*.local
.env.*.production

# Secrets
*.pem
*.key
passkey.pem
private.key
```

## Updating Variables

### After Changing Variables in Railway

1. **Go to Project > Hookshot service**
2. **Edit the variable in Variables section**
3. **Click "Redeploy"** - the new value takes effect
4. **Check logs** to confirm it loaded correctly:
   ```bash
   railway logs --follow
   ```

### Checking Current Variables

To see what variables are currently set in Railway:

```bash
# Using Railway CLI (if installed)
railway env

# Or check in Railway Dashboard:
# Project > Hookshot service > Variables tab
```

## Troubleshooting Variable Issues

### "Cannot read property of undefined"
- A required variable is not set
- Go to Railway Dashboard > Variables
- Check that all required variables are present
- Redeploy

### "Invalid token or credentials"
- `MATRIX_AS_TOKEN` or `MATRIX_HS_TOKEN` is wrong
- Regenerate tokens with setup script
- Update both Railway AND registration.yml

### "Webhook not working"
- `WEBHOOK_URL_PREFIX` is incorrect or not set
- Verify it includes `https://your-app.railway.app/webhook/`
- Redeploy

### App crashes after variable change
- Check app logs: Railway Dashboard > Logs
- Verify format is correct (URLs must include `https://`)
- Check for typos in variable values

## Integration with config.railway.yml

The `config.railway.yml` file uses these variables like this:

```yaml
bridge:
  domain: ${MATRIX_DOMAIN}           # From MATRIX_DOMAIN
  url: ${MATRIX_URL}                 # From MATRIX_URL
  port: ${BRIDGE_PORT:-9993}         # From BRIDGE_PORT or default 9993
  as_token: ${MATRIX_AS_TOKEN}       # From MATRIX_AS_TOKEN
  hs_token: ${MATRIX_HS_TOKEN}       # From MATRIX_HS_TOKEN
```

The `${VAR:-default}` syntax means:
- Use `VAR` if it's set
- Otherwise use the default value after `:-`

## Testing Variables Locally

To test your variables before deploying:

1. **Create a `.env` file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit with your actual values**

3. **Test with Docker:**
   ```bash
   docker build -t matrix-hookshot .
   docker run --env-file .env -v hookshot-data:/data matrix-hookshot
   ```

4. **Check app starts:**
   ```bash
   docker logs [container-id]
   ```

## Deployment Workflow

```
1. Generate tokens
   ↓
2. Set variables in Railway Dashboard
   ↓
3. Push code to GitHub
   ↓
4. Railway auto-deploys
   ↓
5. Check logs for errors
   ↓
6. Verify app loads all variables
   ↓
7. Test webhooks
   ↓
8. Done!
```

## Quick Checklist Before Deploying

- [ ] Copy `.env.example` to reference
- [ ] Generate unique tokens with setup script
- [ ] Add all required variables to Railway Dashboard
- [ ] Verify URLs include `https://` protocol
- [ ] Verify domain matches your setup
- [ ] Redeploy service
- [ ] Check logs for successful start
- [ ] Test webhook connectivity
- [ ] Verify Matrix integration works

---

For more detailed setup instructions, see [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)

# Hookshoot-Bot Railway Deployment Guide

Deploy Matrix Hookshot to Railway and connect to your Synapse production instance.

## ✅ Configuration Ready

Your configuration files are prepared with:
- **App Name**: hookshoot-bot
- **Synapse Domain**: synapse-production-ea3f.up.railway.app
- **Synapse URL**: https://synapse-production-ea3f.up.railway.app

## 🔐 Generated Credentials

These tokens have been generated and configured in your files:

```
as_token:  xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=
hs_token:  Z3v5i7o+TyUuQgVBK+xWQFqnngFJBjuc8Gct1w65wcA=
```

⚠️ **KEEP THESE SECURE** - Do not commit these to git without encryption

## 📋 Step 0: Pre-Deployment Checklist (READ THIS FIRST)

⚠️ **These are CRITICAL prerequisites. Without them, deployment will fail.**

### 0.1 Synapse Server Access
- [ ] **Do you have SSH/file access to your Synapse server?**
  - You CANNOT deploy Hookshot without SSH access to update Synapse's `homeserver.yaml`
  - If you don't have this, stop here and gain access first
  - Without access, you cannot register the bridge with Synapse

### 0.2 Synapse URL Accessibility
- [ ] **Is your Synapse URL publicly accessible?**
  - Hookshot will make HTTP requests TO your Synapse
  - Verify: `curl https://synapse-production-ea3f.up.railway.app/_matrix/client/versions`
  - If this fails, Hookshot can't connect and the bridge won't work

### 0.3 Railway Volume Strategy
- [ ] **Do you understand persistent storage implications?**
  - Railway containers restart frequently
  - WITHOUT a mounted volume at `/data/storage`, you lose:
    - Room configuration links
    - Bridge data
    - Authorization tokens
  - Data loss = manually re-linking all bridges on each restart
  - ✅ **Recommended**: Always use Railway Volume (`/data/storage`)

### 0.4 Environment Variables vs Hardcoding
- [ ] **Will you use Railway Environment Variables?**
  - ❌ **DON'T**: Hardcode tokens in `config.yml` and commit to git
  - ✅ **DO**: Use Railway's environment variable system
  - ✅ **DO**: Keep `config.yml` templates with placeholders like `${MATRIX_AS_TOKEN}`
  - This keeps secrets out of version control

### 0.5 Port Configuration
- [ ] **Do your listener ports match Railway's PORT variable?**
  - Railway provides `${{PORT}}` environment variable
  - Hookshot config must listen on that port
  - If mismatch: Railway routes to wrong port, app appears offline
  - **Verification**: Check `config.yml` `listeners.port` matches Railway's PORT

## 📋 Step 1: Prepare for Railway Deployment

### 1.1 Commit Your Code
```powershell
# From your project root
git add .
git commit -m "Configure Hookshoot for Railway deployment"
git push origin main
```

### 1.2 Ensure GitHub Access
- Your matrix-hookshot repository must be pushed to GitHub
- Your GitHub account must be connected to Railway

## 🚀 Step 2: Create Railway Project

### 2.1 Sign Up / Log In to Railway
1. Go to [https://railway.app](https://railway.app)
2. Sign up with GitHub or log in with existing account

### 2.2 Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Search for and select **matrix-hookshot** repository
4. Railway will auto-detect the Dockerfile ✓

## ⚙️ Step 3: Configure Environment Variables

### 3.1 Navigate to Variables
1. In Railway dashboard, go to your **hookshot-bot** project
2. Click on the service (should be named after your repo)
3. Go to **"Variables"** tab

### 3.2 Environment Variables vs Hardcoding

⚠️ **CRITICAL SECURITY**: Never hardcode secrets in `config.yml`

**DO THIS** (✅ Secure):
```yaml
# config.yml uses placeholders
bridge:
  as_token: ${MATRIX_AS_TOKEN}
  hs_token: ${MATRIX_HS_TOKEN}
```

```powershell
# Set in Railway Variables only (not in git)
MATRIX_AS_TOKEN=xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=
MATRIX_HS_TOKEN=Z3v5i7o+TyUuQgVBK+xWQFqnngFJBjuc8Gct1w65wcA=
```

**DON'T DO THIS** (❌ Insecure):
```yaml
# NEVER hardcode tokens in config.yml
bridge:
  as_token: xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=
  hs_token: Z3v5i7o+TyUuQgVBK+xWQFqnngFJBjuc8Gct1w65wcA=
```

### 3.3 Add Environment Variables
Copy and paste these exactly into Railway Variables:

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
PORT=9993
BRIDGE_BIND_ADDRESS=0.0.0.0
```

### 3.4 Port Configuration Matching

⚠️ **CRITICAL**: Your listener port MUST match Railway's PORT variable

**Check your `config.yml`:**
```yaml
listeners:
  - port: 9993          # This should match PORT variable
    bindAddress: 0.0.0.0
    resources:
      - webhooks
      - widgets
```

**Railway provides**: `PORT=9993` (set above)

**If they don't match**:
- Railway routes to wrong port
- Synapse can't reach Hookshot
- Bridge won't activate
- Error: `Connection refused`

**Verification script**:
```bash
# After deployment, check port in Railway logs:
# "Listening on port 9993" should appear
```

## 💾 Step 4: Configure Persistent Storage

### 4.1 Add Volume Storage
1. In Railway dashboard, click on your service
2. Go to **"Storage"** tab
3. Click **"Add Storage"**
4. Set **Mount Path**: `/data/storage`
5. Set **Storage Size**: `1GB` (or as needed)
6. Click **"Create"**

⚠️ **Important**: Mount to `/data/storage` so your bot doesn't lose data (like room links) when the container restarts.

This stores:
- `/data/config.yml` - Bridge configuration
- `/data/registration.yml` - Matrix registration
- `/data/passkey.pem` - Encryption key
- `/data/storage/` - Room links and persistent data
- `/data/cryptostore/` - E2E encryption data (if enabled)

## 🌐 Step 5: Network Configuration

### 5.1 Expose to Internet
1. Click on your service in Railway
2. Go to **"Networking"** tab
3. Toggle **"Expose to Internet"** ON
4. Railway generates your public URL (should be `https://hookshoot-bot.railway.app`)
5. Note this URL - you'll need it for Synapse

## 🏗️ Step 6: Deploy

### 6.1 Trigger Deployment
The project should auto-deploy when you pushed to GitHub. If not:
1. Click **"Deploy"** button in Railway dashboard
2. Wait for build to complete (~10-15 minutes for first build)

### 6.2 Monitor Deployment
1. Click **"Deployments"** tab
2. Click your active deployment
3. Go to **"View Logs"**
4. Look for messages like:
   ```
   Hookshot server listening on port 9993
   ```

✅ **Deployment successful** if logs show no errors and server is listening

## 📝 Step 7: Register Bridge with Synapse

### 7.1 Critical: Update registration.yml URL
The `url` field in `registration.yml` is where **Synapse sends requests to Hookshot**:

```yaml
url: "https://hookshoot-bot.railway.app"
```

⚠️ **This MUST match your Railway public URL exactly**
- If wrong, Synapse can't see Hookshot
- The bot will never activate
- Verify: `curl https://hookshoot-bot.railway.app` returns a response

### 7.2 Verify Synapse Can Reach Hookshot
Before registering, test the connection:

```bash
# From your Synapse server or any machine with network access:
curl -v https://hookshoot-bot.railway.app

# Expected response: Connection refused is OK (proves URL is reachable)
# Expected error: Name resolution failed = URL is wrong
```

### 7.3 Update Synapse Configuration

On your **Synapse server** (requires SSH access):

1. **Get the registration file**
   ```bash
   # Copy from this repo to your Synapse server
   scp registration.railway.production.yml your-user@your-synapse-server:/path/to/appservices/
   ```

2. **Edit `homeserver.yaml`**
   ```yaml
   app_service_config_files:
     - /path/to/appservices/registration.railway.production.yml
   ```

3. **Verify the registration content matches**
   Key requirements:
   - `as_token`: `xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=`
   - `hs_token`: `Z3v5i7o+TyUuQgVBK+xWQFqnngFJBjuc8Gct1w65wcA=`
   - `url`: `https://hookshoot-bot.railway.app` (must be public URL)
   - Namespace regexes for your domain

### 7.4 Restart Synapse

```bash
# If running in Docker:
docker-compose restart synapse

# Or if systemd:
sudo systemctl restart matrix-synapse

# Watch the logs:
journalctl -u matrix-synapse -f
```

⚠️ **DO NOT skip the restart** - Synapse caches the registration file

## ✅ Step 8: Critical Verification Checklist

### 8.1 Before Registration Check
Before registering with Synapse, verify all connection points:

**1. Hookshot is listening**
```bash
# In Railway logs, look for:
Hookshot server listening on port 9993
```

**2. Railway URL is publicly accessible**
```bash
# From any machine (including your Synapse server):
curl -v https://hookshoot-bot.railway.app

# Expected: HTTP response (any status code is fine)
# Error: Cannot resolve hostname = URL is wrong/unreachable
```

**3. Port matches configuration**
```bash
# Check Railway environment:
PORT=9993        # Must match config.yml listeners.port

# Check config.yml:
listeners:
  - port: 9993   # Must match PORT variable
```

**4. Tokens are consistent**
- `config.railway.production.yml`:
  - `as_token: xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=`
  - `hs_token: Z3v5i7o+TyUuQgVBK+xWQFqnngFJBjuc8Gct1w65wcA=`

- `registration.railway.production.yml`:
  - `as_token: xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=`
  - `hs_token: Z3v5i7o+TyUuQgVBK+xWQFqnngFJBjuc8Gct1w65wcA=`

- Railway environment (if using variables):
  - `MATRIX_AS_TOKEN=xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=`
  - `MATRIX_HS_TOKEN=Z3v5i7o+TyUuQgVBK+xWQFqnngFJBjuc8Gct1w65wcA=`

### 8.2 After Registration Check

**1. Registration file copied to Synapse**
```bash
# On Synapse server:
ls -la /path/to/registration.railway.production.yml
```

**2. Synapse config updated**
```bash
# In homeserver.yaml:
app_service_config_files:
  - /path/to/registration.railway.production.yml
```

**3. Synapse restarted**
```bash
# Check logs for registration:
journalctl -u matrix-synapse -f | grep -i hookshot

# Expected: "Loaded application service: matrix-hookshot"
```

**4. Hookshot bootstrap logs**
```bash
# In Railway logs, look for:
Incoming request from homeserver
Synapse authenticated successfully
Bridge ready
```

## ✅ Step 9: Monitor Deployment & Verify Connection

### 9.1 Check Logs

**In Railway Dashboard:**
1. Go to your hookshoot-bot service
2. Click "View Logs"
3. Look for successful connection to Synapse

**Expected good logs:**
```
Connected to Matrix homeserver
Registering with homeserver...
Bridge ready
```

**Error examples to watch for:**
```
Failed to connect to Matrix homeserver
Invalid token
Connection refused
```

### 9.2 Test in Matrix

1. Join your Matrix server (log in as an admin)
2. Try inviting `@hookshot:synapse-production-ea3f.up.railway.app` to a room
3. If successful, the bot joined!

## 🔧 Configuration Files Reference

### config.railway.production.yml
Contains:
- Bridge domain and URL
- Authentication tokens (as_token, hs_token)
- Listener ports and resources
- Generic webhook configuration
- Widget settings

**Path in Railway**: `/data/config.yml` (copied from uploaded file)

### registration.railway.production.yml
Contains:
- Bridge registration details
- User namespace regexes
- Room alias patterns
- Encryption support flags

**Path in Synapse**: Add to `app_service_config_files` in homeserver.yaml

## 🐛 Troubleshooting

### Build Fails
- Check Railway build logs
- Ensure `yarn.lock` is committed
- Verify Node.js version (needs 22+)

### App Crashes After Deploy
- View runtime logs in Railway
- Check all environment variables are set
- Verify Matrix homeserver is accessible

### Can't Connect to Synapse
- Verify `MATRIX_URL` is publicly accessible
- Check firewall allows outbound HTTPS
- Ensure tokens in config match registration.yml

### Webhooks Not Working
- Verify `WEBHOOK_URL_PREFIX` is correct
- Check webhook provider can reach your Railway URL
- Look for webhook endpoint in logs

### Token Mismatch Errors
```
as_token mismatch / hs_token invalid
```
- Ensure both files use same tokens
- Restart both Hookshot and Synapse
- Double-check no extra spaces in tokens

### Port Binding Issues
```
Failed to bind to port 9993
```
- Railway may override the port with `${{PORT}}` environment variable
- **Solution**: Ensure PORT variable matches config.yml listener port
- Check that `config.yml` has `listeners.port: 9993` (or whatever PORT is set to)
- If still failing, check that no other service is using the port
- Verify in Railway logs: "Listening on port 9993" should appear

### Synapse Can't Connect to Hookshot
```
Bridge not registering
Timeout connecting to bridge
```
- **Problem**: The `url` field in `registration.yml` must match Railway's public URL
- **Solution**:
  1. Verify `url: "https://hookshoot-bot.railway.app"` in registration.yml
  2. Test from Synapse server: `curl https://hookshoot-bot.railway.app`
  3. Must return HTTP response (even if 404/500, not connection refused)
  4. Restart Synapse after updating registration.yml
- **Check Synapse logs** for "Application service registered" message

### Bridge Never Activates
```
Bot doesn't join rooms
Commands not recognized
```
- **Cause 1**: `url` in registration.yml is wrong or unreachable
- **Cause 2**: Tokens mismatch between registration.yml and config.yml
- **Cause 3**: Synapse not restarted after registration.yml update
- **Solution**:
  1. Verify registration.yml `url` matches Railway public URL
  2. Verify both `as_token` and `hs_token` match in both files
  3. Restart Synapse: `docker-compose restart synapse`
  4. Check both application logs (Synapse + Hookshot)

### Storage/Volume Not Persisting Data
```
Room links lost after restart
Data cleared between deployments
```
- **Solution**: Ensure storage is mounted to `/data/storage` (not just `/data`)
- Verify storage exists in Railway dashboard: Service → Storage
- Check mount path is exactly `/data/storage`
- Storage size should be at least 1GB
- Data persists even if the container restarts, but is lost if you delete the volume

## 📊 Monitoring

### View Logs
Railway Dashboard → Service → Deployments → View Logs

### Check Metrics
Railway Dashboard → Service → Metrics (shows CPU, Memory, Network)

### Common Metrics
- **Memory**: Should be < 500MB at startup
- **CPU**: Should be near 0% when idle
- **Network**: Incoming requests should appear here

## 🔄 Updates & Rollbacks

### Deploy Updates
```powershell
# Make code changes
git add .
git commit -m "Update Hookshot configuration"
git push origin main
# Railway auto-deploys

# Or manually: Railway Dashboard → Deploy button
```

### Rollback to Previous Version
1. Railway Dashboard → Deployments
2. Click previous deployment
3. Click "Redeploy"
4. Select "Redeploy as current"

## 🚨 Important Notes

### Security
- ✅ Tokens are unique and strong
- ✅ Use Railway's environment variables (not in code)
- ✅ Don't expose `passkey.pem` publicly
- ✅ Rotate tokens every 3-6 months
- ✅ Railway uses `${{PORT}}` - set PORT environment variable to 9000 if binding fails

### Performance
- Start with 1GB storage
- Monitor memory usage
- Add cache (Redis) if needed for multiple bridges

### Network
- All URLs use HTTPS (required for Matrix)
- Webhook endpoints need public access
- Firewall must allow outbound HTTPS

## 📚 Additional Resources

- [Matrix Hookshot Docs](https://matrix-org.github.io/matrix-hookshot/)
- [Railway Docs](https://docs.railway.app/)
- [Application Service Spec](https://spec.matrix.org/latest/application-service-api/)
- See [SETUP_SYNAPSE_HOOKSHOT.md](SETUP_SYNAPSE_HOOKSHOT.md) for detailed architecture info

## ✔️ Deployment Checklist

### ✅ Critical Pre-Deployment (Do NOT proceed without these)
- [ ] You have SSH access to your Synapse server
- [ ] Your Synapse URL is publicly accessible (curl test passed)
- [ ] You understand Railway Volume persistence requirements
- [ ] You'll use environment variables for secrets (not hardcode in git)
- [ ] Your listener port (9993) matches Railway PORT variable

### ✅ Deployment Steps
- [ ] Code committed and pushed to GitHub
- [ ] Answered all questions in Step 0 checklist
- [ ] Railway project created
- [ ] Environment variables added to Railway
- [ ] Storage/volume configured at `/data/storage` (1GB minimum)
- [ ] Internet exposure toggled ON
- [ ] All verification checks in Step 8 passed
- [ ] Deployment successful (Railway logs show no errors)

### ✅ Synapse Registration
- [ ] SSH access to Synapse server confirmed
- [ ] Registration file copied to Synapse server
- [ ] `homeserver.yaml` updated with registration file path
- [ ] Synapse restarted successfully
- [ ] Synapse logs show bridge registration: "Loaded application service: matrix-hookshot"
- [ ] Hookshot logs show: "Incoming request from homeserver"

### ✅ Verification & Testing
- [ ] Can curl Hookshot URL: `curl https://hookshoot-bot.railway.app`
- [ ] Can invite `@hookshot:synapse-production-ea3f.up.railway.app` to test room
- [ ] Bot successfully joins the room
- [ ] Webhooks configured for your integrations (GitHub, GitLab, etc.)

---

**Status**: Ready for production deployment
**Last Updated**: March 2, 2026

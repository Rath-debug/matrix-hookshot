# Railway Deployment Guide for matrix-hookshot

## Prerequisites
- Railway account (free tier available at https://railway.app)
- GitHub account with your matrix-hookshot repo pushed
- Matrix homeserver details (URL, credentials)
- Webhook URL configuration

## Step-by-Step Deployment

### 1. Connect GitHub to Railway
1. Go to [railway.app](https://railway.app)
2. Sign up/Login with GitHub
3. Click "New Project" > "Deploy from GitHub repo"
4. Select your `matrix-hookshot` repository
5. Railway will auto-detect the Dockerfile

### 2. Configure Environment Variables in Railway

Add these variables in the Railway project dashboard under "Variables":

```
# Matrix Homeserver Configuration
MATRIX_DOMAIN=your-homeserver-domain.com
MATRIX_URL=https://your-homeserver-domain.com
MATRIX_AS_TOKEN=your-as-token-here
MATRIX_HS_TOKEN=your-hs-token-here
MATRIX_USER_ID=@hookshot:your-homeserver-domain.com

# Bridge Configuration
BRIDGE_PORT=9993
BRIDGE_BIND_ADDRESS=0.0.0.0

# Webhook & Widgets Configuration
WEBHOOK_URL_PREFIX=https://your-railway-app.railway.app/webhook/
WIDGET_PUBLIC_URL=https://your-railway-app.railway.app/widgetapi/v1/static/

# Logging
LOG_LEVEL=info
LOG_COLORIZE=false
```

### 3. Update config.yml for Railway

Create a new `config.railway.yml` in the project root or modify `config.yml` to use environment variables:

```yaml
bridge:
  domain: ${MATRIX_DOMAIN}
  url: ${MATRIX_URL}
  port: ${BRIDGE_PORT:-9993}
  bindAddress: ${BRIDGE_BIND_ADDRESS:-0.0.0.0}
  as_token: ${MATRIX_AS_TOKEN}
  hs_token: ${MATRIX_HS_TOKEN}
  userId: ${MATRIX_USER_ID}

logging:
  level: ${LOG_LEVEL:-info}
  colorize: ${LOG_COLORIZE:-false}

passFile: /data/passkey.pem

listeners:
  - port: 9001
    bindAddress: 0.0.0.0
    resources:
      - widgets
      - webhooks

generic:
  enabled: true
  urlPrefix: ${WEBHOOK_URL_PREFIX}
  allowJsTransformationFunctions: true
  waitForComplete: true

widgets:
  publicUrl: ${WIDGET_PUBLIC_URL}
  roomSetupWidget:
    addOnInvite: true
  branding:
    widgetTitle: Hookshot Configuration
  openIdOverrides:
    "${MATRIX_DOMAIN}": "${MATRIX_URL}"
```

### 4. Railway Volume Storage

Your app needs persistent storage for:
- `/data/config.yml`
- `/data/registration.yml`
- `/data/passkey.pem`

**In Railway Dashboard:**
1. Go to your project
2. Click on the hookshot service
3. Click "Storage" > "Add Storage"
4. Set mount path to `/data`
5. Set size to 1GB (or as needed)

### 5. Railway Build & Deployment Settings

**Build Configuration:**
- Dockerfile: `./Dockerfile`
- Build Command: (leave empty - uses Dockerfile)
- Start Command: (leave empty - uses Dockerfile CMD)

**Port Mapping:**
- Your Dockerfile exposes ports 9993 and 7775
- Railway will automatically map these
- Public URL will be: `https://your-railway-app.railway.app`

### 6. Expose Your Service

1. In Railway dashboard, go to the hookshot service
2. Click "Networking"
3. Toggle "Expose to Internet" ON
4. Note the generated public URL

### 7. Matrix Homeserver Registration

Register your bridge with your Matrix homeserver:

1. Copy your `registration.yml` file
2. Add to your Synapse configuration:
   ```yaml
   app_service_config_files:
     - /path/to/registration.yml
   ```
3. Restart Synapse

Update `registration.yml` with your Railway app details:
```yaml
id: matrix-hookshot
as_token: <use MATRIX_AS_TOKEN value>
hs_token: <use MATRIX_HS_TOKEN value>
sender_localpart: hookshot
namespaces:
  users:
    - exclusive: false
      regex: '@github_.*'
    - exclusive: false
      regex: '@gitlab_.*'
    # Add others as needed
rate_limited: false
```

## Important Notes

### 1. Security
- **Never commit secrets** to git
- Use Railway's environment variables for all sensitive data
- Rotate tokens regularly
- Use strong, unique tokens for `as_token` and `hs_token`

### 2. Network Configuration
- Replace all `localhost` references with your actual domain
- Replace IP addresses (172.23.34.244) with your Railway app URL
- Example: `http://localhost:9001` → `https://your-railway-app.railway.app`

### 3. Database (Optional)
If you need to scale beyond a single instance:
- Add PostgreSQL from Railway marketplace
- Update your config to point to the database

### 4. Monitoring
- View logs in Railway dashboard: Deployments > View Logs
- Check metrics: CPU, Memory, Network usage
- Set up alerts for failures

### 5. Updates & Rollbacks
- Railway auto-deploys from your main branch
- Each deployment creates a snapshot
- Rollback: Click previous deployment and "Redeploy"

## Troubleshooting

### Build Fails
- Check build logs in Railway dashboard
- Ensure `yarn.lock` is committed
- Verify Node.js version matches (needs 22+)

### App Crashes
- Check runtime logs
- Verify all environment variables are set
- Check Matrix homeserver connectivity

### Webhooks Not Working
- Verify `WEBHOOK_URL_PREFIX` is set to your Railway URL
- Check firewall/network rules
- Ensure webhook provider can reach Railway app

### Volume Issues
- Verify `/data` volume is mounted
- Check file permissions in Railway
- Monitor storage usage

## Cost Estimation

- **Free tier** gets $5 credit/month:
  - 500 CPU core-hours
  - 100 GB memory-hours
  - Good for testing/small deployments

- **Production**: ~$10-20/month depending on traffic

## Environment Variables Checklist

Before deploying, gather:
- [ ] Matrix domain
- [ ] Matrix homeserver URL
- [ ] as_token (generate random string)
- [ ] hs_token (generate random string)
- [ ] Matrix user ID
- [ ] GitHub/GitLab tokens (if integrating)
- [ ] Any other service credentials

## Need Help?

- Railway Docs: https://docs.railway.app
- matrix-hookshot Docs: Check `/docs` folder
- Matrix IRC: #matrix-dev on libera.chat

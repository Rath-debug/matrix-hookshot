# Railway Deployment Checklist for matrix-hookshot

## Pre-Deployment

### Local Setup Verification
- [ ] All code committed and pushed to GitHub
- [ ] No uncommitted changes (`git status` shows clean)
- [ ] `yarn.lock` file is committed
- [ ] Dockerfile builds locally without errors
- [ ] Configuration files validated

### Infrastructure Requirements
- [ ] Matrix homeserver running and accessible
- [ ] Matrix homeserver domain and URL ready
- [ ] GitHub account (for Railway connection)
- [ ] Railway account created (https://railway.app)

## Generate Credentials

### Generate Tokens
- [ ] Run setup script (bash or PowerShell):
  ```bash
  # For Linux/Mac:
  chmod +x scripts/railway-setup.sh
  bash scripts/railway-setup.sh

  # For Windows:
  powershell -ExecutionPolicy Bypass -File scripts/railway-setup.ps1
  ```
- [ ] Save generated tokens securely
- [ ] Document as_token
- [ ] Document hs_token

### Gather Configuration
- [ ] Matrix domain (e.g., matrix.org)
- [ ] Matrix homeserver URL (e.g., https://matrix.org)
- [ ] Hookshot Matrix user ID (e.g., @hookshot:matrix.org)
- [ ] Decide on Railway app name
- [ ] Calculate Railway URLs:
  - [ ] Webhook URL: `https://[app-name].railway.app/webhook/`
  - [ ] Widget URL: `https://[app-name].railway.app/widgetapi/v1/static/`

## Railway Project Setup

### Create Project
- [ ] Log into Railway (https://railway.app)
- [ ] Click "New Project"
- [ ] Select "Deploy from GitHub repo"
- [ ] Connect GitHub and select matrix-hookshot repo
- [ ] Railway auto-detects Dockerfile ✓

### Environment Variables
- [ ] Go to Project Settings > Variables
- [ ] Add all variables from setup script:
  - [ ] MATRIX_DOMAIN
  - [ ] MATRIX_URL
  - [ ] MATRIX_USER_ID
  - [ ] MATRIX_AS_TOKEN
  - [ ] MATRIX_HS_TOKEN
  - [ ] WEBHOOK_URL_PREFIX
  - [ ] WIDGET_PUBLIC_URL
  - [ ] LOG_LEVEL (set to `info`)
  - [ ] LOG_COLORIZE (set to `false`)
  - [ ] BRIDGE_PORT (9993)
  - [ ] BRIDGE_BIND_ADDRESS (0.0.0.0)

### Storage Configuration
- [ ] Click on hookshot service
- [ ] Click "Storage" > "Add Storage"
- [ ] Set mount path: `/data`
- [ ] Set storage size: 1GB (or as needed)
- [ ] Confirm storage created

### Network Configuration
- [ ] Click on hookshot service
- [ ] Click "Networking"
- [ ] Toggle "Expose to Internet" ON
- [ ] Note the generated Railway URL
- [ ] Verify both ports (9993, 7775) are exposed

### Build Settings
- [ ] Build Command: (empty - uses Dockerfile)
- [ ] Start Command: (empty - uses Dockerfile CMD)
- [ ] Environment: Production

## Deploy to Railway

### Initial Deployment
- [ ] Trigger deployment (usually auto-deploys on push)
- [ ] Or manually click "Deploy" button
- [ ] Wait for build to complete (~10-15 minutes for first build)
- [ ] Check build logs for errors

### Verify Deployment
- [ ] View deployment logs (Deployments > View Logs)
- [ ] Confirm app started successfully
- [ ] Look for errors or crashes
- [ ] Check that volumes mounted properly
- [ ] Verify environment variables loaded

### Copy Important Info
- [ ] Copy Railway public URL (e.g., `https://xxxx-prod.railway.app`)
- [ ] Copy webhook endpoint: `{RAILWAY_URL}/webhook/`
- [ ] Copy widget endpoint: `{RAILWAY_URL}/widgetapi/v1/static/`

## Matrix Homeserver Configuration

### Register Bridge
- [ ] Update registration.yml with tokens from setup script
- [ ] Copy registration.yml to homeserver
- [ ] Update Synapse config to include registration file
- [ ] Set app_service_url: `https://your-railway-url`

### Restart Homeserver
- [ ] Restart Synapse/Matrix homeserver
- [ ] Check homeserver logs for bridge registration
- [ ] Verify no errors

## Post-Deployment Testing

### Basic Connectivity
- [ ] Bridge appears in Matrix room operations
- [ ] Can invite @hookshot:your-domain to room
- [ ] Bot responds to basic commands
- [ ] Webhooks endpoint is reachable

### Webhook Testing
- [ ] Send test webhook from integration (GitHub, GitLab, etc.)
- [ ] Verify webhook received in Railway logs
- [ ] Verify message appears in Matrix room
- [ ] Check formatting is correct

### Widget Testing
- [ ] Load widget in room settings
- [ ] Verify widget URL loads without errors
- [ ] Test widget functionality
- [ ] Confirm proper styling/branding

## Monitoring

### Configure Logging
- [ ] Set LOG_LEVEL appropriately
- [ ] Monitor logs for errors/warnings
- [ ] Set up log aggregation if needed
- [ ] Check metrics on port 7775 (if enabled)

### Resource Monitoring
- [ ] Monitor CPU usage in Railway dashboard
- [ ] Monitor memory usage
- [ ] Check network bandwidth usage
- [ ] Monitor storage space

### Set Up Alerts
- [ ] Configure failure notifications
- [ ] Set up performance alerts
- [ ] Monitor deployment history

## Troubleshooting Checkpoints

If deployment fails at any point:

### Build Failures
- [ ] Check `yarn.lock` is committed
- [ ] Verify Node.js 22+ required
- [ ] Check build logs for specific errors
- [ ] Ensure no private npm packages without auth

### Runtime Failures
- [ ] Verify all environment variables set
- [ ] Check Matrix homeserver is accessible
- [ ] Verify tokens are correct
- [ ] Check firewall/network rules
- [ ] Review application logs

### Webhook/Widget Issues
- [ ] Verify WEBHOOK_URL_PREFIX is correct
- [ ] Verify WIDGET_PUBLIC_URL is correct
- [ ] Check CORS configuration if needed
- [ ] Verify webhook provider can reach Railway

## Rollback Procedure

If issues occur:
- [ ] Go to Deployments tab
- [ ] Find previous working deployment
- [ ] Click "Redeploy"
- [ ] Wait for rollback to complete
- [ ] Investigate issue before re-deploying

## Production Checklist

Before going live:
- [ ] Load test with expected webhook volume
- [ ] Test all integrations (GitHub, GitLab, etc.)
- [ ] Verify backup/disaster recovery plan
- [ ] Document runbooks for common issues
- [ ] Set up monitoring and alerting
- [ ] Create incident response procedures
- [ ] Communicate URL to team
- [ ] Document any Matrix-specific configuration

## Maintenance

### Regular Tasks
- [ ] Weekly: Check logs for errors
- [ ] Weekly: Verify all integrations working
- [ ] Monthly: Update dependencies
- [ ] Monthly: Review and rotate tokens (quarterly)
- [ ] Quarterly: Security audit

### When Updating
- [ ] Test updates in staging first
- [ ] Tag releases in git
- [ ] Document changes in CHANGELOG.md
- [ ] Plan zero-downtime deployment if possible

---

**Status:** Use this checklist to track deployment progress. Update the boxes as you complete each step.

**Need Help?**
- Railway Docs: https://docs.railway.app
- matrix-hookshot Docs: See `/docs` folder
- Review RAILWAY_DEPLOYMENT.md for detailed instructions

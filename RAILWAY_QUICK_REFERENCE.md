# Railway Quick Reference Guide for matrix-hookshot

## Quick Start (TL;DR)

1. **Run setup script:**
   ```bash
   # Linux/Mac
   bash scripts/railway-setup.sh

   # Windows
   powershell -ExecutionPolicy Bypass -File scripts/railway-setup.ps1
   ```

2. **Copy environment variables to Railway dashboard**

3. **Ensure GitHub is connected and repo is pushed**

4. **Railway auto-deploys** when Dockerfile is detected

5. **Update Matrix homeserver** with registration.yml

6. **Done!** Bridge should be live at `https://your-app.railway.app`

---

## Essential Commands (After Deployment)

### View Logs
```bash
# Via Railway CLI (if installed)
railway logs

# Or via Dashboard:
# Project > Hookshot service > Deployments > View Logs
```

### Check Status
```bash
# Via Dashboard:
# Project > Hookshot service > Logs or Metrics

# Check if service is running:
curl https://your-app.railway.app/health
```

### Restart Service
```bash
# Via Dashboard:
# Project > Hookshot service > Redeploy button
# Or deploy from latest commit
```

### Update Config
1. Modify `config.yml` or `config.railway.yml`
2. Push to GitHub
3. Railway auto-deploys from main branch
4. Or manually click "Deploy" in dashboard

### Update Environment Variables
1. Go to Dashboard
2. Project > Variables
3. Edit values
4. Redeploy service for changes to take effect

---

## Common Tasks

### Check Webhook Endpoint
```
https://your-app.railway.app/webhook/
```

### Check Widget Endpoint
```
https://your-app.railway.app/widgetapi/v1/static/
```

### View Application Metrics
```
Port 7775 (if enabled in config)
https://your-app.railway.app:7775/metrics
```

### Monitor Storage Usage
```
Dashboard > Hookshot service > Storage
```

### View Deployment History
```
Dashboard > Deployments tab
- Lists all deployments
- Shows timestamps and statuses
- Can rollback to any previous deployment
```

---

## Environment Variable Reference

| Variable | Example | Required? | Notes |
|----------|---------|-----------|-------|
| `MATRIX_DOMAIN` | `matrix.org` | Yes | Homeserver domain |
| `MATRIX_URL` | `https://matrix.org` | Yes | Homeserver URL |
| `MATRIX_USER_ID` | `@hookshot:matrix.org` | Yes | Bridge user ID |
| `MATRIX_AS_TOKEN` | (base64) | Yes | Generated token |
| `MATRIX_HS_TOKEN` | (base64) | Yes | Generated token |
| `WEBHOOK_URL_PREFIX` | `https://app.railway.app/webhook/` | Yes | Webhook endpoint |
| `WIDGET_PUBLIC_URL` | `https://app.railway.app/widgetapi/v1/static/` | Yes | Widget endpoint |
| `LOG_LEVEL` | `info` | No | debug, info, warn, error |
| `LOG_COLORIZE` | `false` | No | true/false |
| `BRIDGE_PORT` | `9993` | No | Default shown |
| `BRIDGE_BIND_ADDRESS` | `0.0.0.0` | No | Default shown |

---

## Troubleshooting Quick Reference

### Build Failure
```
→ Check build logs in Railway dashboard
→ Verify yarn.lock is committed
→ Ensure Node.js 22+ compatible
→ Check for private npm packages
```

### App Crashes
```
→ View runtime logs: Dashboard > Logs
→ Verify all environment variables set
→ Test Matrix homeserver connectivity
→ Check file permissions on /data volume
```

### Webhooks Not Received
```
→ Verify WEBHOOK_URL_PREFIX is correct
→ Test with curl: curl -X POST https://your-app.railway.app/webhook/...
→ Check Railway logs for errors
→ Verify firewall allows incoming connections
```

### Config Not Loaded
```
→ Verify config.yml exists in /data volume
→ Check logs for config parse errors
→ Ensure environment variables passed correctly
→ Redeploy service: Dashboard > Redeploy
```

### Matrix Bridge Not Responding
```
→ Verify registration.yml correctly configured
→ Check tokens match environment variables
→ Verify Synapse can reach https://your-railway-app.railway.app
→ Restart Matrix homeserver
→ Check homeserver logs
```

### Storage Full
```
→ Dashboard > Hookshot service > Storage
→ Check current usage
→ Delete old logs if needed
→ Increase storage size
→ Redeploy
```

---

## Port Reference

| Port | Purpose | Config Variable |
|------|---------|-----------------|
| 9993 | Bridge API & webhooks | `BRIDGE_PORT` |
| 9001 | Internal listeners | (fixed) |
| 7775 | Prometheus metrics | (metrics.port) |

---

## Files You've Created

| File | Purpose |
|------|---------|
| `RAILWAY_DEPLOYMENT.md` | Complete deployment guide |
| `RAILWAY_DEPLOYMENT_CHECKLIST.md` | Step-by-step checklist |
| `config.railway.yml` | Environment variable template |
| `railway.json` | Railway configuration metadata |
| `scripts/railway-setup.sh` | Token generation (Linux/Mac) |
| `scripts/railway-setup.ps1` | Token generation (Windows) |

---

## Useful Links

- **Railway Dashboard:** https://railway.app/dashboard
- **Railway Docs:** https://docs.railway.app
- **Railway Support:** https://github.com/railwayapp/issues
- **matrix-hookshot Docs:** See `/docs` folder
- **Matrix Dev Chat:** #matrix-dev@libera.chat

---

## Cost Optimization

### Free Tier Usage
- Get $5 credit/month
- Monitor usage on Dashboard > Usage tab
- Ideal for testing/small deployments

### Reduce Costs
- Turn off metrics if not needed
- Optimize application memory usage
- Use efficient logging levels
- Monitor/delete old logs regularly
- Scale down resources when possible

### Estimate Monthly Cost
```
Formula: (CPU hours × $0.065) + (Memory hours × $0.0325) + data transfer

Example (small app):
- 50 CPU core-hours/month = $3.25
- 50 GB memory-hours/month = $1.63
- Total: ~$5/month
```

---

## Deployment Status Indicators

| Status | Meaning | Action |
|--------|---------|--------|
| 🟢 Green | Running normally | Monitor |
| 🟡 Yellow | Building or deploying | Wait for completion |
| 🔴 Red | Failed or crashed | Check logs, investigate |
| ⚫ Black | Stopped | Redeploy or check config |

---

## Pro Tips

1. **Use Railway CLI** for faster local testing:
   ```bash
   npm install -g @railway/cli
   railway link
   railway run npm start
   ```

2. **Monitor from command line:**
   ```bash
   railway logs --follow
   ```

3. **Test webhooks locally before production:**
   ```bash
   # Use ngrok or similar to test locally
   ngrok http 9093
   ```

4. **Save deployment configs:**
   - Export environment variables regularly
   - Version control registration.yml
   - Document any manual changes

5. **Set up error tracking:**
   - Consider adding Sentry integration
   - Monitor metrics endpoint
   - Review logs weekly

---

## Support Escalation

### Level 1: Try yourself
- [ ] Check logs
- [ ] Review environment variables
- [ ] Verify configuration
- [ ] Consult these guides

### Level 2: Check resources
- [ ] Railway Docs
- [ ] matrix-hookshot docs
- [ ] GitHub issues

### Level 3: Get support
- [ ] Railway Support: https://railway.app/support
- [ ] matrix-hookshot Issues: https://github.com/matrix-org/matrix-hookshot
- [ ] Matrix Community: #matrix@libera.chat

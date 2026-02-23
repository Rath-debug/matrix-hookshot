# Railway Deployment Troubleshooting Guide

## Build Phase Issues

### Issue: Build Fails - "yarn not found"
**Symptoms:** Build log shows `yarn: command not found`

**Solution:**
1. Verify `yarn.lock` is committed:
   ```bash
   git check-ignore yarn.lock   # Should return nothing
   git ls-files | grep yarn.lock # Should show yarn.lock
   ```
2. If missing:
   ```bash
   git add yarn.lock
   git commit -m "Add yarn.lock"
   git push
   ```
3. Redeploy in Railway

---

### Issue: Build Fails - "CARGO_NET_GIT_FETCH_WITH_CLI"
**Symptoms:** Rust build fails with fetch errors

**Solution:**
1. This is usually for ARM64 builds (Raspberry Pi, M1 Mac servers)
2. Add environment variable in Railway:
   ```
   CARGO_NET_GIT_FETCH_WITH_CLI=true
   ```
3. Redeploy

---

### Issue: Build Timeout - Takes > 20 minutes
**Symptoms:** Build gets killed/times out

**Solution:**
1. First build is always slow (compiles Rust code)
2. Subsequent builds use cache and are faster
3. For very large deployments:
   - Check Railway plan allows longer builds
   - Consider building Rust locally and committing binaries
   - Use Railway Pro plan for more resources

---

### Issue: "Permission denied" During Build
**Symptoms:**
```
/bin/sh: 1: scripts/build-app.sh: Permission denied
```

**Solution:**
1. Make scripts executable:
   ```bash
   chmod +x scripts/build-app.sh
   chmod +x scripts/railway-setup.sh
   git add scripts/
   git commit -m "Fix script permissions"
   git push
   ```
2. Redeploy

---

## Deployment/Runtime Issues

### Issue: App Crashes Immediately
**Symptoms:**
- Deployment shows red status
- Logs show crash within seconds
- Service keeps restarting

**Diagnosis:**
1. Check logs immediately:
   ```
   Dashboard > Deployments > View Logs
   ```
2. Look for:
   - Missing config files: "ENOENT: no such file"
   - Missing environment variables
   - Port already in use
   - Module not found errors

**Solution by error type:**

**A) Missing config.yml:**
```
Error: ENOENT: no such file or directory, open '/data/config.yml'
```
- Config must be in `/data` volume
- Check volume is mounted
- Or pre-create config in /data during init

**B) Missing environment variable:**
```
Error: Cannot read property 'MATRIX_DOMAIN' of undefined
```
- Go to Dashboard > Variables
- Verify all required variables are set
- Redeploy after adding

**C) Wrong Matrix credentials:**
```
Error: Invalid token or credentials
```
- Verify MATRIX_AS_TOKEN matches registration.yml
- Verify MATRIX_HS_TOKEN matches registration.yml
- Regenerate tokens if unsure
- Update both Railway and registration.yml

**D) Cannot reach Matrix server:**
```
Error: ECONNREFUSED or EHOSTUNREACH for MATRIX_URL
```
- Verify MATRIX_URL is correct and reachable from internet
- Test from browser: visit MATRIX_URL in browser
- Check firewall rules on Matrix server
- Verify URL includes protocol: `https://`

---

### Issue: "Cannot find module" Error
**Symptoms:**
```
Error: Cannot find module 'xyz'
```

**Solution:**
1. These should have been installed during build
2. Check build log for npm/yarn errors
3. If build succeeded but module missing:
   - Delete `node_modules`
   - Clear cache
   - Redeploy
4. If specific package missing:
   ```bash
   yarn add [package-name]
   git add yarn.lock
   git commit -m "Add missing package"
   git push
   ```

---

## Configuration Issues

### Issue: Config File Not Found
**Symptoms:**
```
Error: Cannot read file '/data/config.yml'
Bridge startup failed
```

**Solutions:**

**Option A: Pre-create config in Railway**
1. Dashboard > Hookshot service > Storage
2. Verify `/data` volume is mounted
3. Add startup script to copy template:
   ```bash
   # In Dockerfile before CMD:
   RUN mkdir -p /data
   COPY config.railway.yml /data/config.yml
   COPY registration.sample.yml /data/registration.yml
   ```

**Option B: Mount config from Railway**
1. Create config files locally
2. Copy to Railway:
   ```bash
   railway exec cp config.railway.yml /data/config.yml
   railway exec cp registration.yml /data/registration.yml
   ```

**Option C: Use environment variables**
1. Modify app to read environment variables directly
2. Or update config building logic
3. See `config.railway.yml` template

---

### Issue: Wrong Configuration Being Used
**Symptoms:**
- Local test works, Railway deployment doesn't
- Changes not taking effect after redeploy
- Wrong URLs in logs

**Solutions:**
1. Verify correct config file:
   ```bash
   railway exec cat /data/config.yml
   ```
2. Check environment variables are loaded:
   ```bash
   railway exec env | grep MATRIX
   ```
3. Look for:
   - Old config file still in use
   - Environment variable not substituted
   - Wrong path in startup command

---

## Network & Connectivity Issues

### Issue: Webhooks Endpoint Not Reachable
**Symptoms:**
```
curl: (7) Failed to connect to your-app.railway.app port 443
```

**Solutions:**
1. Verify app is running:
   ```bash
   railway logs --tail 50
   ```
2. Check app is listening on port 9993:
   - App logs should show "Listening on port 9993"
   - Check BRIDGE_PORT environment variable

3. Ensure port is exposed in Railway:
   - Dashboard > Hookshot service > Networking
   - Toggle "Expose to Internet" ON
   - Verify port 9993 is exposed

4. Test connectivity:
   ```bash
   # Simple health check
   curl -v https://your-app.railway.app/

   # Webhook endpoint
   curl -v https://your-app.railway.app/webhook/
   ```

---

### Issue: "Connection Refused" from Matrix Server
**Symptoms:**
```
Error: ECONNREFUSED when trying to reach Matrix server
Matrix homeserver not responding
```

**Solutions:**
1. Verify MATRIX_URL is correct:
   - Should be public URL of homeserver
   - Should include protocol: `https://`
   - Example: `https://matrix.example.com`

2. Test from Railway container:
   ```bash
   railway exec curl -v https://matrix.example.com
   ```

3. Check firewall rules:
   - Is Matrix server behind firewall?
   - Does it allow external connections?
   - Check port 8008 or 8448

4. Check DNS:
   ```bash
   railway exec nslookup matrix.example.com
   ```

---

### Issue: CORS Errors on Widgets
**Symptoms:**
```
Access to XMLHttpRequest at 'https://...' blocked by CORS
```

**Solutions:**
1. Add CORS headers in config:
   ```yaml
   widgets:
     corsUrl: "https://your-railway-app.railway.app"
   ```

2. Or allow all origins in widgets:
   ```yaml
   widgets:
     allowAllOrigins: true
   ```

3. Update WIDGET_PUBLIC_URL to correct domain

---

## Storage & Volume Issues

### Issue: "No Space Left" Error
**Symptoms:**
```
Error: ENOSPC: no space left on device
Deployment fails silently
```

**Solutions:**
1. Check storage usage:
   ```
   Dashboard > Hookshot service > Storage
   ```

2. Increase storage size:
   - Click storage entry
   - Increase capacity
   - Redeploy app

3. Clean up logs:
   ```bash
   railway exec rm -f /data/*.log
   ```

4. Monitor regularly to prevent recurrence

---

### Issue: Data Persists After Restart (Expected, but...)
**Symptoms:**
- Old config still loaded after restart
- Changes to container files ignored

**Why:**
- Volume persists data across restarts
- New container code doesn't overwrite volume files

**Solution:**
1. Update files in volume:
   ```bash
   railway exec bash
   # Then: cp /bin/matrix-hookshot/config.yml /data/config.yml
   # Or: edit manually with vim
   ```

2. Or delete volume and redeploy:
   ```
   Dashboard > Storage > Delete
   Then redeploy
   WARNING: This deletes all stored data!
   ```

---

## Token & Authentication Issues

### Issue: "Invalid as_token" or "Invalid hs_token"
**Symptoms:**
```
Error: Bridge authentication failed
Matrix homeserver rejected registration
```

**Solutions:**
1. Verify tokens match:
   - Check MATRIX_AS_TOKEN in Railway
   - Check as_token in registration.yml
   - They **must be identical**

   ```bash
   # Get Railway value
   railway env | grep MATRIX_AS_TOKEN

   # Check registration.yml
   cat registration.yml | grep as_token
   ```

2. If they don't match:
   - Regenerate new tokens:
     ```bash
     openssl rand -base64 32  # As token
     openssl rand -base64 32  # Hs token
     ```
   - Update BOTH Railway AND registration.yml
   - Redeploy everything
   - Restart Matrix homeserver

3. Verify registration.yml format:
   ```yaml
   id: matrix-hookshot
   as_token: YOUR_TOKEN_HERE
   hs_token: YOUR_TOKEN_HERE
   ```

---

### Issue: "User ID not recognized"
**Symptoms:**
```
Error: User @hookshot:example.com not found
```

**Solutions:**
1. Verify MATRIX_USER_ID format:
   ```
   @hookshot:your-domain.com
   ```
   - Must start with @
   - Must include colon before domain
   - Domain must match MATRIX_DOMAIN

2. Check it matches registration.yml:
   ```yaml
   sender_localpart: hookshot
   ```

3. User might not exist in homeserver yet
   - First registration attempt creates user
   - Give bot time to initialize

---

## Monitoring & Performance

### Issue: App CPU Usage at 100%
**Symptoms:**
- Dashboard shows high CPU
- Webhooks slow to respond
- Logs show "busy"

**Solutions:**
1. Check for infinite loops in logs:
   ```bash
   railway logs --follow | grep -i loop
   ```

2. Reduce webhook processing:
   ```yaml
   generic:
     waitForComplete: false
   ```

3. Check for leaks:
   - Is memory growing over time?
   - Restart app: Dashboard > Redeploy

4. Increase resources:
   - Railway Pro plan
   - Add more CPU allocation

---

### Issue: High Memory Usage / Out of Memory
**Symptoms:**
```
JavaScript heap out of memory
App crashes without error messages
```

**Solutions:**
1. Check memory usage:
   ```
   Dashboard > Metrics > Memory
   ```

2. Reduce memory usage:
   ```bash
   # Set Node.js memory limit
   railway env NODE_OPTIONS="–max-old-space-size=1024"
   ```

3. Reduce webhook history/cache:
   ```yaml
   # Limit cache size in config
   cache:
     maxSize: 1000
   ```

4. Upgrade to plan with more memory

---

## Deployment Rollback

### Issue: Everything Broke After Update
**Symptoms:**
- Bridge not working after git push
- Want to go back to previous version

**Solution:**
1. Go to Dashboard > Deployments
2. Find last working deployment (green checkmark)
3. Click "View" > "Redeploy"
4. Wait for rollback to complete
5. Investigate issue in git

---

## Getting Help

### Information to Gather Before Asking for Help

1. **Logs:**
   ```bash
   railway logs --tail 100 > logs.txt
   ```

2. **Configuration:**
   ```bash
   railway exec cat /data/config.yml > config.txt
   railway env > env.txt
   ```

3. **Error messages** - copy exact text
4. **Timeline** - when did it start failing?
5. **Recent changes** - what changed since last working state?

### Where to Ask

- **Railway Issues:** https://github.com/railwayapp/issues
- **matrix-hookshot Issues:** https://github.com/matrix-org/matrix-hookshot/issues
- **Matrix Support:** ircs://libera.chat/#matrix or #matrix-dev

---

## Quick Debug Checklist

When app isn't working, check in order:

1. **Is the service running?**
   ```bash
   railway logs --tail 5
   ```

2. **Is it listening on the right port?**
   ```bash
   railway exec netstat -tlnp | grep 9993
   ```

3. **Are environment variables set?**
   ```bash
   railway env | grep MATRIX
   ```

4. **Can it reach Matrix server?**
   ```bash
   railway exec curl -v https://MATRIX_URL
   ```

5. **Is the volume mounted?**
   ```bash
   railway exec ls -la /data/
   ```

6. **Are firewall rules correct?**
   - Check Railway networking settings
   - Check Matrix server firewall

7. **Are tokens correct?**
   - Compare Railway env vs registration.yml
   - Should be identical base64 strings

---

## Prevention Tips

To avoid future issues:

1. **Test Locally First**
   - Use docker-compose locally
   - Mirror Railway config
   - Test all integrations

2. **Version Control Everything**
   - Commit config changes
   - Document environment changes
   - Keep changelog updated

3. **Monitor Regularly**
   - Check logs daily
   - Review metrics weekly
   - Set up alerts for failures

4. **Backup Important Data**
   - Export registration.yml monthly
   - Backup tokens securely
   - Document all manual configs

5. **Keep Documentation Updated**
   - Update this guide for your setup
   - Document custom changes
   - Create runbooks for common tasks

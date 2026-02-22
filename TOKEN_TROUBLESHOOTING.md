# Matrix Hookshot - Token Missing Checklist

## ✅ Symptoms
- Bridge connection error
- 401/403 Unauthorized errors
- "Token missing" or "Invalid token" messages
- Bridge not appearing in room
- Webhooks not working

---

## 🔧 Quick Fix (5 Minutes)

### Step 1: Generate New Tokens

**On Windows (PowerShell):**
```powershell
cd scripts
./generate-tokens.ps1
```

**On Linux/macOS/WSL:**
```bash
bash scripts/generate-tokens.sh
```

### Step 2: Update config.yml
```yaml
bridge:
  as_token: PASTE_AS_TOKEN_HERE
  hs_token: PASTE_HS_TOKEN_HERE
```

### Step 3: Update registration.yml
```yaml
as_token: PASTE_AS_TOKEN_HERE
hs_token: PASTE_HS_TOKEN_HERE
```

### Step 4: Restart Bridge
```bash
docker-compose down
docker-compose up -d
```

### Step 5: Verify
```bash
docker-compose logs hookshot | grep -i "token\|auth"
```

---

## ✔️ Verification Checklist

- [ ] Tokens are 44+ characters (base64)
- [ ] AS token is identical in config.yml and registration.yml
- [ ] HS token is identical in config.yml and registration.yml
- [ ] No extra spaces or line breaks in tokens
- [ ] registration.yml is in Synapse directory
- [ ] Synapse homeserver.yaml includes registration.yml
- [ ] Synapse has been restarted (not just reloaded)
- [ ] Bridge is running: `docker-compose ps`
- [ ] No validation errors in logs: `docker-compose logs hookshot`

---

## 📋 Location Reference

### config.yml Locations
```yaml
bridge:
  as_token: <-- Line ~7
  hs_token: <-- Line ~8
```

### registration.yml Locations
```yaml
as_token: <-- Line ~2
hs_token: <-- Line ~3
```

---

## 🐛 Debug Commands

```bash
# Check if tokens match
grep "as_token\|hs_token" config.yml
grep "as_token\|hs_token" registration.yml

# View full logs
docker-compose logs -f hookshot

# Test bridge connectivity
curl -v http://localhost:9993/_matrix/app/v1/users/@test:localhost

# Check Synapse configuration
docker-compose exec synapse grep app_service registration.yaml

# Restart all services
docker-compose restart

# Full reset (WARNING: Clears data)
docker-compose down -v
docker-compose up -d
```

---

## 🚨 Common Mistakes

| Mistake | Solution |
|---------|----------|
| Tokens don't match | Regenerate and update BOTH files |
| Extra spaces in token | Copy token exactly, no spaces |
| registration.yml not registered | Copy to Synapse dir, update homeserver.yaml |
| Synapse not restarted | Run `docker-compose restart synapse` |
| Wrong homeserver URL | Update `bridge.url` in config.yml |
| Port conflicts | Check `docker-compose ps`, verify ports available |

---

## 📞 If Still Not Working

## 1. Check Logs
```bash
docker-compose logs --tail=50 hookshot
docker-compose logs --tail=50 synapse
```

## 2. Verify Network
```bash
# Can bridge reach Synapse?
docker-compose exec hookshot curl http://synapse:8008

# Can Synapse reach bridge?
docker-compose exec synapse curl http://hookshot:9993
```

## 3. Reset & Retry
```bash
# Reset bridge
npm run reset-crypto

# Clear and rebuild
docker-compose down
rm -rf data/*
docker-compose up -d
```

## 4. Manual Token Check
```bash
# Export tokens
AS_TOKEN=$(grep "as_token:" config.yml | awk '{print $2}')
HS_TOKEN=$(grep "hs_token:" config.yml | awk '{print $2}')

# Verify they match registration.yml
grep "$AS_TOKEN" registration.yml
grep "$HS_TOKEN" registration.yml
# Should show matches, else tokens don't match
```

---

## 🔨 Build Errors

### Error: Vite - "Cannot resolve @vector-im/compound-design-tokens/assets"

**Symptoms:**
```
[vite]: Rollup failed to resolve import "@vector-im/compound-design-tokens/assets/web/icons/error-solid"
Build failed in 3.07s
exit code: 1
```

**Root Cause:**
Compound-web imports icon assets from compound-design-tokens, and Vite can't resolve these asset paths during bundling.

**Solution (Applied):**

The `vite.config.mjs` has been updated with comprehensive external handling:

```javascript
rollupOptions: {
  external: (id) => {
    // Mark compound CSS and assets as external, not bundled
    if (id.includes('@vector-im/compound-web/dist/style.css')) return true
    if (id.includes('@vector-im/compound-design-tokens/assets/')) return true
    return false
  },
  onwarn: (warning, warn) => {
    // Suppress unresolved warnings for compound packages
    if (
      warning.code === 'UNRESOLVED_IMPORT' &&
      (warning.source?.includes('@vector-im/compound-design-tokens/assets/') ||
       warning.source?.includes('@vector-im/compound-web/dist/style.css'))
    ) {
      return  // Skip warning
    }
    warn(warning)
  },
}
```

This:
1. Marks all compound assets as external (not bundled)
2. Suppresses warnings for these known external dependencies
3. Allows the build to succeed despite unresolved asset imports

**To rebuild with the fix:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Monitor build progress (takes 8-12 minutes)
docker-compose logs -f hookshot
```

**If still failing, do a complete clean rebuild:**
```bash
# On Windows:
docker system prune -a --force
docker volume prune --force

# Then rebuild
docker-compose build --no-cache
docker-compose up -d
```

---

### Error: "git was not found in the system"

**Symptoms:**
```
WARNING: current commit information was not captured by the build: git was not found
```

**Solution:** This is a warning, not an error. Git is used to capture commit info. The Bridge will still work fine. To suppress the warning in Docker:

```dockerfile
RUN apt-get update && apt-get install -y git
```

Or ignore - the bridge will still work.

---

## 📚 More Help

- **SETUP_GUIDE.md** - Full step-by-step setup
- **Matrix Room** - [#hookshot:half-shot.uk](https://matrix.to/#/#hookshot:half-shot.uk)
- **Docs** - [matrix-org.github.io/matrix-hookshot](https://matrix-org.github.io/matrix-hookshot)


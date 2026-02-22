# ✅ Matrix Hookshot - Setup Complete!

## Current Status

### ✅ Hookshot Bridge (RUNNING)
- **Service:** matrix-hookshot-dev-app-1
- **Status:** Up and running
- **Webhooks Port:** 9001
- **Bridge API Port:** 9993
- **Redis/Valkey:** Running on port 6379

### 🔄 Synapse Homeserver (STARTING)
- **Service:** synapse
- **Status:** Starting up (may take 30-60 seconds)
- **API Port:** 8008
- **Database:** PostgreSQL running on port 5434
- **Note:** Give it time to fully initialize

---

## Quick Verification

### Step 1: Wait for Synapse to be Ready
```powershell
# Monitor Synapse startup
cd synapse
docker-compose logs -f synapse

# Wait for message like:
# "Listening on TCP port 8008"
# Then press Ctrl+C to exit logs
```

### Step 2: Test Both Services

```powershell
# Test Synapse (may take 30-60 seconds)
curl http://localhost:8008/_matrix/client/versions

# Expected output:
# {"versions": ["r0.0.1", "r0.0.2", ...]}

# Test Hookshot metrics
curl http://localhost:9001/metrics

# Expected output: Prometheus metrics data
```

### Step 3: Verify All Containers

```powershell
# Hookshot containers
cd C:\Projects\rexform\bot-sdk\matix-bot\matrix-hookshot
docker-compose ps

# Expected:
# NAME                            STATUS
# matrix-hookshot-dev-app-1       Up
# matrix-hookshot-dev-valkey-1    Up
# matrix-hookshot-dev-init-app-1  Exited (normal - one-time setup)

# Synapse containers
cd synapse
docker-compose ps

# Expected:
# NAME               STATUS
# synapse            Up
# synapse-postgres   Up
```

---

## Common Issues & Fixes

### Issue: "Empty reply from server" on port 8008
**Cause:** Synapse is still starting
**Fix:** Wait 30-60 seconds and try again
```powershell
Start-Sleep -Seconds 30
curl http://localhost:8008/_matrix/client/versions
```

### Issue: Synapse Exited (137)
**Cause:** Container was killed (likely OOM or stopped)
**Fix:** Restart it
```powershell
cd synapse
docker-compose up -d synapse
```

### Issue: Port 9001 or 8008 already in use
**Fix:** Free up the port
```powershell
netstat -ano | findstr :<port>
taskkill /F /PID <pid>
```

### Issue: Docker Desktop not responding
**Fix:** Restart Docker
```powershell
Stop-Process -Name "Docker Desktop" -Force
Start-Sleep -Seconds 10
# Reopen Docker Desktop from Start Menu
```

---

## Next Steps

### 1. **Register Hookshot with Synapse**

Make sure the registration.yml is loaded by Synapse's homeserver.yaml:

```yaml
# In synapse/synapse-data/homeserver.yaml, add:
app_service_config_files:
  - /data/registration.yml
```

### 2. **Create Bot User (Optional)**

Synapse should automatically create the `@hookshot:localhost` user when it receives requests.

### 3. **Invite Bridge to a Room**

```
In any Matrix room:
/invite @hookshot:localhost
```

### 4. **Test with Webhook**

```bash
curl -X POST http://localhost:9001/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello Hookshot!"}'
```

### 5. **Configure Integrations**

Once running, configure:
- GitHub
- GitLab
- Jira
- OpenProject
- RSS Feeds
- Generic Webhooks

---

## Documentation

- **STARTUP_INSTRUCTIONS.md** - How to start services
- **SETUP_GUIDE.md** - Full setup and configuration
- **TOKEN_TROUBLESHOOTING.md** - Debug common issues

---

## Architecture Overview

```
┌────────────────────────────────────────────┐
│         Matrix Ecosystem                   │
├────────────────────────────────────────────┤
│                                            │
│  Client Apps (Element, Riot, etc)          │
│    ↓      ↓        ↓                       │
│  :8008 (Synapse Home Server)               │
│  ├─ Database: PostgreSQL :5434             │
│  └─ Config: homeserver.yaml                │
│    ↓                                       │
│  App Service (Hookshot Bridge)             │
│  ├─ :9993 Bridge API                       │
│  ├─ :9001 Webhooks & Widgets               │
│  └─ Cache: Valkey :6379                    │
│    ↓                                       │
│  External Services                         │
│  ├─ GitHub                                 │
│  ├─ GitLab                                 │
│  ├─ Jira                                   │
│  └─ etc.                                   │
│                                            │
└────────────────────────────────────────────┘
```

---

## Useful Commands

### Start Both Services
```powershell
# Terminal 1: Synapse
cd synapse
docker-compose up -d

# Terminal 2: Hookshot
cd ..
docker-compose up -d
```

### Stop Both Services
```powershell
# Hookshot
cd C:\Projects\rexform\bot-sdk\matix-bot\matrix-hookshot
docker-compose down

# Synapse
cd synapse
docker-compose down
```

### View Logs
```powershell
# Hookshot
cd C:\Projects\rexform\bot-sdk\matix-bot\matrix-hookshot
docker-compose logs -f app

# Synapse
cd synapse
docker-compose logs -f synapse
```

### Restart Services
```powershell
# Hookshot
cd C:\Projects\rexform\bot-sdk\matix-bot\matrix-hookshot
docker-compose restart app

# Synapse
cd synapse
docker-compose restart synapse
```

### Full Clean Rebuild
```powershell
# Stop everything
cd C:\Projects\rexform\bot-sdk\matix-bot\matrix-hookshot
docker-compose down -v
cd synapse
docker-compose down -v

# Rebuild
cd C:\Projects\rexform\bot-sdk\matix-bot\matrix-hookshot
docker-compose build --no-cache
docker-compose up -d

cd synapse
docker-compose up -d
```

---

## Support & Resources

- **Local Services:**
  - Synapse API: http://localhost:8008
  - Hookshot Webhooks: http://localhost:9001
  - Hookshot Metrics: http://localhost:9001/metrics

- **Documentation:**
  - Synapse: https://matrix-org.github.io/synapse/
  - Hookshot: https://matrix-org.github.io/matrix-hookshot/

- **Community:**
  - Matrix Room: [#hookshot:half-shot.uk](https://matrix.to/#/#hookshot:half-shot.uk)
  - Matrix Spec: https://spec.matrix.org/

---

## Setup Checklist

- [x] Docker Compose configured
- [x] Hookshot app container running
- [x] Valkey cache running
- [x] Synapse homeserver starting
- [x] PostgreSQL database running
- [ ] Synapse fully initialized (wait 30-60 seconds)
- [ ] Verify Synapse API responding (curl test)
- [ ] Register Hookshot with Synapse
- [ ] Invite @hookshot:localhost to test room
- [ ] Test webhook functionality

---

**Setup is %(percentage)s complete! 🎉**

Once Synapse is fully started and responding to API requests, you're ready to use Matrix Hookshot!


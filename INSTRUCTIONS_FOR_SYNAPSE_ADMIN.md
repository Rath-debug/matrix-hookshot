# Instructions for Synapse Administrator

**To whom it may concern:**

I am deploying a Matrix Hookshot bridge on Railway. I need you to register this Application Service with our Synapse homeserver. Below is all the information you need.

---

## What is Hookshot?

Hookshot is an Application Service that allows Matrix to integrate with external services like GitHub, GitLab, Jira, and webhooks. It acts as a "bridge" between Matrix and these services.

**Why this is needed**: Without this registration, Synapse won't know about Hookshot and the bridge won't work.

---

## Information Needed from You

### 1. Synapse Server Details
- [ ] Where is `homeserver.yaml` located on your server?
- [ ] Path: `_________________`

- [ ] How do I restart Synapse after changes?
- [ ] Command: `_________________`

- [ ] Can you access Synapse logs?
- [ ] Log location: `_________________`

---

## What You Need to Do

### Step 1: Create the Registration File

Create a new file on your Synapse server:
```
/path/to/synapse/appservices/hookshot-registration.yml
```

**File contents** (copy exactly):
```yaml
id: matrix-hookshot
as_token: ${MATRIX_AS_TOKEN}
hs_token: ${MATRIX_HS_TOKEN}
namespaces:
  rooms: []
  users:
    - regex: "@_github_.*:synapse-production-ea3f.up.railway.app"
      exclusive: false
    - regex: "@_gitlab_.*:synapse-production-ea3f.up.railway.app"
      exclusive: false
    - regex: "@_jira_.*:synapse-production-ea3f.up.railway.app"
      exclusive: false
    - regex: "@_webhooks_.*:synapse-production-ea3f.up.railway.app"
      exclusive: false
    - regex: "@feeds:synapse-production-ea3f.up.railway.app"
      exclusive: false
  aliases:
    - regex: "#hookshot.*:synapse-production-ea3f.up.railway.app"
      exclusive: true
sender_localpart: hookshot
url: https://hookshoot-bot.railway.app
rate_limited: false
de.sorunome.msc2409.push_ephemeral: true
push_ephemeral: true
org.matrix.msc3202: true
```

**IMPORTANT**: Replace the placeholder tokens with actual values:
- `${MATRIX_AS_TOKEN}` → `xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=`
- `${MATRIX_HS_TOKEN}` → `Z3v5i7o+TyUuQgVBK+xWQFqnngFJBjuc8Gct1w65wcA=`

**What these tokens mean:**
- `as_token`: Application Service token (Hookshot uses to identify itself to Synapse)
- `hs_token`: Homeserver token (Synapse uses to authenticate to Hookshot)

### Step 2: Update homeserver.yaml

Edit your `homeserver.yaml` and find the `app_service_config_files:` section:

**Before:**
```yaml
app_service_config_files:
  # - /path/to/other/appservices/service.yml
```

**After** (add this line):
```yaml
app_service_config_files:
  - /path/to/synapse/appservices/hookshot-registration.yml
```

### Step 3: Restart Synapse

```bash
# If using Docker:
docker-compose restart synapse

# If using systemd:
sudo systemctl restart matrix-synapse

# If using other method:
[your restart command here]
```

### Step 4: Verify Registration

Check the logs to confirm registration was successful:

```bash
# If using systemd:
journalctl -u matrix-synapse -f

# If using Docker:
docker-compose logs -f synapse
```

**Look for this message:**
```
Loaded application service: matrix-hookshot
```

**If you see this message, it's working** ✅

---

## Critical Information

### Tokens
- **as_token**: `xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=`
- **hs_token**: `Z3v5i7o+TyUuQgVBK+xWQFqnngFJBjuc8Gct1w65wcA=`

⚠️ **These tokens MUST match exactly** in:
- The registration.yml file you create
- Railway's environment variables (my side)

If they don't match, the bridge won't authenticate.

### URLs
- **Hookshot URL**: `https://hookshoot-bot.railway.app`
  - This is where Synapse will send requests to Hookshot
  - Must be publicly accessible

- **Synapse Domain**: `synapse-production-ea3f.up.railway.app`
  - This is your Synapse's public domain
  - Used in Matrix user IDs (@user:synapse-production-ea3f.up.railway.app)

### Namespaces
The registration file claims these user patterns for Hookshot:
- `@_github_*` - GitHub bot users
- `@_gitlab_*` - GitLab bot users
- `@_jira_*` - Jira bot users
- `@_webhooks_*` - Generic webhook users
- `@feeds` - Feed service bot

**Don't worry about these** - they tell Synapse which users belong to Hookshot.

---

## What NOT to Do

❌ Don't modify these values:
- `id: matrix-hookshot` - Application service ID
- `namespaces:` - User and room patterns
- `sender_localpart: hookshot` - Service account name
- `de.sorunome.msc2409.push_ephemeral: true` - Encryption support flags

❌ Don't hardcode the tokens in other places

❌ Don't forget to restart Synapse

---

## Troubleshooting

### Problem: "Failed to load application service"
- Check file syntax (YAML format)
- Verify the file path in homeserver.yaml is correct
- Restart Synapse again

### Problem: Synapse can't reach Hookshoot
- Verify `url: https://hookshoot-bot.railway.app` is correct
- Test from Synapse server: `curl -v https://hookshoot-bot.railway.app`
- Check Synapse can make outbound HTTPS connections
- Check firewall allows outbound HTTPS (port 443)

### Problem: Connection refused / timeout
- Verify Hookshot is deployed on Railway (not crashed)
- Check Railway logs: https://railway.app
- Verify the public URL is correct

### Problem: Token mismatch errors
- Verify tokens match EXACTLY (no extra spaces)
- Verify tokens match the ones in Railway environment variables
- Restart Synapse

---

## Confirmation Checklist

After you make these changes, please confirm:

- [ ] Created `/path/to/synapse/appservices/hookshot-registration.yml`
- [ ] File contains the registration YAML above (with actual tokens)
- [ ] Updated `homeserver.yaml` to include the registration file
- [ ] Restarted Synapse
- [ ] Checked logs and saw "Loaded application service: matrix-hookshot"
- [ ] Tested: `curl -v https://hookshoot-bot.railway.app` (returns response)

---

## My Information (for questions)

- **Hookshot Deployment**: Railway (`https://hookshoot-bot.railway.app`)
- **App Name**: hookshoot-bot
- **Tokens Generated**: [date/time]
- **Contact**: [your contact info]

---

## Quick Reference

| Item | Value |
|------|-------|
| Registration File Location | `/path/to/appservices/hookshot-registration.yml` |
| as_token | `xCQMUY7OiTqdXFTLP++kbErFIQR4E70ZQgwGNk+UEx8=` |
| hs_token | `Z3v5i7o+TyUuQgVBK+xWQFqnngFJBjuc8Gct1w65wcA=` |
| Hookshot URL | `https://hookshoot-bot.railway.app` |
| Synapse Domain | `synapse-production-ea3f.up.railway.app` |
| Service ID | `matrix-hookshot` |
| Service Localpart | `hookshot` |

---

Once you've completed these steps, please let me know that:
1. ✅ Registration file created
2. ✅ homeserver.yaml updated
3. ✅ Synapse restarted
4. ✅ Logs show "Loaded application service: matrix-hookshot"

Then my Hookshot bridge will be ready to use! 🎉

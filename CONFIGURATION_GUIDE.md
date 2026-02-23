# Hookshot Configuration Guide

This guide explains the two main configuration files: `config.yml` and `registration.yml`, and how to adjust them for different environments.

## Quick Overview

| File | Purpose | Used By |
|------|---------|---------|
| **config.yml** | Hookshot service configuration | Hookshot application |
| **registration.yml** | Matrix AppService registration | Synapse homeserver |

---

## 1. registration.yml - AppService Registration

This file **registers Hookshot** with your Matrix homeserver. It's what Synapse uses to know about the bot.

### Current Configuration:

```yaml
id: matrix-hookshot
as_token: 7lo0XQLbKRd9PnEiiIv9AIzxg3+FpWmnpAUydjqQTN0=
hs_token: NP9HAIwk7G9j7j3Ui4Z0MXjeFuP/hOlVD9ZL0ZwdFB8=

namespaces:
  rooms: []
  users:
    - regex: "@_github_.*:localhost"
      exclusive: false
    - regex: "@_gitlab_.*:localhost"
      exclusive: false
    - regex: "@_jira_.*:localhost"
      exclusive: false
    - regex: "@_webhooks_.*:localhost"
      exclusive: false
    - regex: "@feeds:localhost"
      exclusive: false
  aliases:
    - regex: "#hookshot.*:localhost"
      exclusive: true

sender_localpart: hookshot
url: "http://host.docker.internal:9993"
rate_limited: false
```

### What Each Section Does:

| Field | Meaning | Current Value |
|-------|---------|----------------|
| **id** | Unique identifier for this AppService | `matrix-hookshot` |
| **as_token** | Secret token Hookshot uses to authenticate with Synapse | Auto-generated |
| **hs_token** | Secret token Synapse uses to authenticate with Hookshot | Auto-generated |
| **namespaces.users** | User patterns Hookshot handles (bot accounts for integrations) | Handles `@_github_`, `@_gitlab_`, `@_jira_`, `@_webhooks_`, `@feeds` |
| **namespaces.aliases** | Room alias patterns (must contain `localhost`) | Matches `#hookshot*` |
| **sender_localpart** | Username of the main bot account | `hookshot` |
| **url** | Where Synapse can reach Hookshot | `http://host.docker.internal:9993` |

### If Using Custom Domain

If you have your own Synapse domain (e.g., `example.com`):

```yaml
id: matrix-hookshot
as_token: [keep-generated-token]
hs_token: [keep-generated-token]

namespaces:
  rooms: []
  users:
    - regex: "@_github_.*:example.com"        # ← Change to your domain
      exclusive: false
    - regex: "@_gitlab_.*:example.com"        # ← Change to your domain
    - regex: "@_jira_.*:example.com"          # ← Change to your domain
    - regex: "@_webhooks_.*:example.com"      # ← Change to your domain
    - regex: "@feeds:example.com"             # ← Change to your domain
  aliases:
    - regex: "#hookshot.*:example.com"        # ← Change to your domain
      exclusive: true

sender_localpart: hookshot
url: "http://your-hookshot-host:9993"        # ← Change to Hookshot's actual address
rate_limited: false
```

**⚠️ Important:** After modifying `registration.yml`, you must:
1. Restart Synapse
2. Restart Hookshot

---

## 2. config.yml - Hookshot Application Settings

This file **configures Hookshot itself**. It tells Hookshot how to connect to Synapse and what features to enable.

### Current Configuration Breakdown:

```yaml
bridge:
  domain: localhost                           # Your Synapse domain
  url: http://host.docker.internal:8008     # Where Synapse API is (internal)
  port: 9993                                 # Port Hookshot listens on
  bindAddress: 0.0.0.0                       # Listen on all interfaces
  as_token: 7lo0XQLbKDd9PnEiiIv9AIzxg3+FpWmnpAUydjqQTN0=    # Must match registration.yml
  hs_token: NP9HAIwk7G9j7j3Ui4Z0MXjeFuP/hOlVD9ZL0ZwdFB8=   # Must match registration.yml
  userId: "@hookshot:localhost"               # Bot user ID
```

### Service Configurations:

#### Generic Webhooks (Currently Enabled)
```yaml
generic:
  enabled: true
  urlPrefix: http://172.23.34.244:9001/webhook/    # Where to send webhook payloads
  allowJsTransformationFunctions: true              # Allow custom JS transforms
  waitForComplete: true                             # Wait for confirmation
```

#### GitHub (Disabled - Needs Auth)
```yaml
#github:
#  auth:
#    id: YOUR_GITHUB_APP_ID
#    privateKeyFile: path/to/private-key.pem
#  webhook:
#    secret: your-webhook-secret
#  oauth:
#    client_id: your-github-oauth-id
#    client_secret: your-github-oauth-secret
#    redirect_uri: https://your-domain/oauth/
```

#### Widgets
```yaml
widgets:
  publicUrl: http://172.23.34.244:9001/widgetapi/v1/static/  # External widget URL
  roomSetupWidget:
    addOnInvite: true                         # Show widget when bot joins
```

---

## Configuration Examples

### Scenario 1: Local Docker Setup (Current)

**Synapse Domain:** `localhost`
**Synapse Address:** `http://synapse:8008` (inside Docker)
**Hookshot Address:** `http://hookshot:9993` (inside Docker)
**External Access:** `http://172.23.34.244:9001`

#### registration.yml:
```yaml
namespaces:
  users:
    - regex: "@_github_.*:localhost"
    - regex: "@_gitlab_.*:localhost"
  aliases:
    - regex: "#hookshot.*:localhost"

sender_localpart: hookshot
url: "http://host.docker.internal:9993"
```

#### config.yml:
```yaml
bridge:
  domain: localhost
  url: http://host.docker.internal:8008
  port: 9993

generic:
  urlPrefix: http://172.23.34.244:9001/webhook/

widgets:
  publicUrl: http://172.23.34.244:9001/widgetapi/v1/static/
```

---

### Scenario 2: Own Domain Setup

**Synapse Domain:** `matrix.example.com`
**Synapse Address:** `https://matrix.example.com` (external)
**Hookshot Address:** `https://hookshot.example.com` (external)
**Internal Hookshot:** `http://hookshot-server:9993`

#### registration.yml:
```yaml
namespaces:
  users:
    - regex: "@_github_.*:matrix.example.com"      # ← Your domain
    - regex: "@_gitlab_.*:matrix.example.com"
    - regex: "@_jira_.*:matrix.example.com"
    - regex: "@_webhooks_.*:matrix.example.com"
    - regex: "@feeds:matrix.example.com"
  aliases:
    - regex: "#hookshot.*:matrix.example.com"      # ← Your domain

sender_localpart: hookshot
url: "https://hookshot.example.com:9993"           # ← External
```

#### config.yml:
```yaml
bridge:
  domain: matrix.example.com                        # ← Your domain
  url: https://matrix.example.com                   # ← External URL
  port: 9993
  bindAddress: 0.0.0.0

generic:
  urlPrefix: https://hookshot.example.com/webhook/  # ← External URL

widgets:
  publicUrl: https://hookshot.example.com/widgetapi/v1/static/  # ← External URL
```

---

## Token Security

The `as_token` and `hs_token` are **security credentials**:

- **as_token**: Hookshot proves to Synapse it's legitimate. Keep secret!
- **hs_token**: Synapse proves to Hookshot it's legitimate. Keep secret!

**Must match** in both files. Generate new ones with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Common Issues

### Issue: Widget not appearing
- **Cause:** Widget URL unreachable (172.23.34.244 might not exist for your client)
- **Fix:** Change to actual IP/hostname and restart Hookshot

### Issue: Bot can't connect to Synapse
- **Cause:** Wrong `domain` or `url` in config.yml
- **Fix:** Ensure `url` points to accessible Synapse API

### Issue: Synapse doesn't recognize bot
- **Cause:** Domain mismatch in registration.yml and config.yml
- **Fix:** Check `domain: localhost` matches `@_github_.*:localhost` patterns

### Issue: Commands not working
- **Cause:** Bot not granted proper permissions in room
- **Fix:** Give bot moderator (power level 50+) in the room

---

## Summary Checklist

When modifying config for **custom domain**:

- [ ] Update `domain` in config.yml
- [ ] Update `url` in config.yml (Synapse address)
- [ ] Update `urlPrefix` in generic config (external webhook URL)
- [ ] Update `publicUrl` in widgets config (external widget URL)
- [ ] Update all `domain` parts in registration.yml (e.g., `:localhost` → `:example.com`)
- [ ] Update `url` in registration.yml (Hookshot external address)
- [ ] Keep `as_token` and `hs_token` identical in both files
- [ ] Restart both Synapse and Hookshot

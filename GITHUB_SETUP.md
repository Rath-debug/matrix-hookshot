# GitHub Hookshot Integration Setup

This guide walks you through creating a GitHub App and configuring it with Hookshot.

## Step 1: Create a GitHub App

1. Go to [GitHub App Settings](https://github.com/settings/apps)
2. Click **"New GitHub App"**
3. Fill in the following details:

### Basic Information
- **GitHub App name:** `Hookshot` (or your preferred name)
- **Homepage URL:** `http://localhost:8008` (or your Hookshot instance URL)
- **User authorization callback URL:** `http://localhost:8008/oauth/`
  - ⚠️ **IMPORTANT:** This must exactly match what you put in `config.yml` under `oauth.redirect_uri`
- **Webhook URL:** `http://localhost:8008/github/webhook`
  - ⚠️ **IMPORTANT:** This must be publicly accessible
- **Webhook secret:** Generate a secure secret (you'll use this in config.yml)

### Permissions

Enable the following permissions:

#### Repository Permissions:
- Actions: `Read-only`
- Contents: `Read-only`
- Discussions: `Read & write`
- Issues: `Read & write`
- Metadata: `Read-only` (auto-enabled)
- Projects: `Read & write`
- Pull requests: `Read & write`

#### Organization Permissions:
- Team discussions: `Read & write`

### Subscribe to Events

Check the following event types:
- ☑ Commit comment
- ☑ Create
- ☑ Delete
- ☑ Discussion
- ☑ Discussion comment
- ☑ Issue comment
- ☑ Issues
- ☑ Project
- ☑ Project card
- ☑ Project column
- ☑ Pull request
- ☑ Pull request review
- ☑ Pull request review comment
- ☑ Push
- ☑ Release
- ☑ Repository
- ☑ Workflow run

### Where is app available?
- ☑ **Only on this account** (unless you want to make it available to others)

---

## Step 2: Get Your Credentials

After creating the app, you'll see your **App ID** at the top of the page. Write this down.

### Get Your Client ID and Secret:

1. Scroll down to **Client secrets** section
2. Click **"Generate a new client secret"**
3. Copy the **Client ID** and **Client Secret** (you'll only see the secret once!)

### Generate Private Key:

1. Scroll down to **Private keys** section
2. Click **"Generate a private key"**
3. A `.pem` file will be downloaded automatically
4. Save this file and note its location

---

## Step 3: Update Your Configuration Files

### Create the Private Key File

Copy the downloaded private key file to your Hookshot data directory:

**For Docker users:**
- Place the file at: `/data/github-key.pem` (inside the container)
- Or better: Place it in your local directory and map it in `docker-compose.yml`

**For local users:**
- Place the file at the location specified in `config.yml`

### Update config.yml

Edit `config.yml` and replace these values:

```yaml
github:
  enabled: true
  auth:
    id: 123456789                    # ← Replace with your App ID
    privateKeyFile: /data/github-key.pem
  webhook:
    secret: your_webhook_secret_here # ← Replace with your webhook secret
  oauth:
    client_id: Iv1.abc123xyz         # ← Replace with your Client ID
    client_secret: ghp_abc123xyz     # ← Replace with your Client Secret
    redirect_uri: http://localhost:8008/oauth/  # ← Update if using custom domain
```

### Update Webhook URL in GitHub

Go back to your GitHub App settings and update the **Webhook URL** to match your actual Hookshot instance:

- If local: `http://localhost:8008/github/webhook`
- If on server: `https://your-domain.com/github/webhook`

---

## Step 4: Restart Hookshot

After updating the configuration:

```bash
# If using Docker Compose:
docker-compose restart hookshot

# If running locally:
# Kill and restart the Hookshot process
```

---

## Step 5: Test the Integration

### In Matrix:

1. Invite the `@hookshot:localhost` bot to a room
2. Use the command: `!hookshot github connect`
3. Follow the OAuth flow to authorize your GitHub account
4. Once authorized, you can bridge a GitHub repository

### Example Commands:
```
!hookshot github connect                           # Connect your GitHub account
!hookshot github repo setup https://github.com/user/repo
!hookshot github issues                            # List linked issues
```

---

## Troubleshooting

### "No Such Resource" Error

**Cause:** GitHub integration not properly enabled or credentials missing
**Fix:**
- Check that `github.enabled: true` in config.yml
- Verify all credentials are correct
- Restart Hookshot after config changes

### Webhook Secret Mismatch

**Error:** Webhook events not being processed
**Fix:**
- Ensure webhook secret in config.yml matches GitHub App settings
- Both must be exactly the same

### OAuth Redirect URL Mismatch

**Error:** OAuth callback fails
**Fix:**
- `redirect_uri` in config.yml MUST exactly match the Callback URL in GitHub App settings
- Both must include the trailing slash: `http://localhost:8008/oauth/`

### Private Key File Not Found

**Error:** Hookshot fails to start
**Fix:**
- Verify the path in `privateKeyFile` is correct
- For Docker: ensure the file path is mounted correctly
- Check file permissions (should be readable)

---

## Security Notes

⚠️ **Important:**
- Keep your **private key** secure - never commit it to git
- Keep your **Client Secret** secret - don't share it
- Keep your **webhook secret** secret
- Store these in environment variables or secure files, not in plaintext config

To use environment variables in Docker:

```yaml
# docker-compose.yml example
environment:
  GITHUB_APP_ID: ${GITHUB_APP_ID}
  GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET}
  GITHUB_WEBHOOK_SECRET: ${GITHUB_WEBHOOK_SECRET}
```

---

## Next Steps

Once GitHub is configured and working:

1. **Authenticate with GitHub:** `!hookshot github connect`
2. **Bridge a Repository:** `!hookshot github repo setup <repo-url>`
3. **Configure Notifications:** Set which GitHub events trigger room messages
4. **Set Up Room Links:** Link specific GitHub repos to specific Matrix rooms

For more details, see [GitHub Usage Guide](docs/usage/room_configuration/github_repo.md)

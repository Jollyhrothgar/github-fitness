# GitHub Fitness OAuth Worker

This Cloudflare Worker handles OAuth token exchange for GitHub authentication.

## Setup Instructions

### 1. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name:** GitHub Fitness
   - **Homepage URL:** `https://yourusername.github.io/github-fitness`
   - **Authorization callback URL:** `https://yourusername.github.io/github-fitness/oauth/callback`
4. Click "Register application"
5. Generate a new client secret
6. Note your **Client ID** and **Client Secret**

### 2. Deploy the Cloudflare Worker

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Navigate to the worker directory:
   ```bash
   cd worker
   ```

4. Set the secrets:
   ```bash
   wrangler secret put GITHUB_CLIENT_ID
   # Enter your GitHub OAuth App Client ID

   wrangler secret put GITHUB_CLIENT_SECRET
   # Enter your GitHub OAuth App Client Secret

   wrangler secret put ALLOWED_ORIGIN
   # Enter: https://yourusername.github.io
   ```

5. Deploy the worker:
   ```bash
   wrangler deploy
   ```

6. Note the worker URL (e.g., `https://github-fitness-oauth.yourusername.workers.dev`)

### 3. Configure the Frontend

Create a `.env.local` file in the project root:

```env
VITE_GITHUB_CLIENT_ID=your_client_id_here
VITE_OAUTH_PROXY_URL=https://github-fitness-oauth.yourusername.workers.dev
```

### Testing

You can test the worker locally:

```bash
cd worker
wrangler dev
```

Then test with curl:

```bash
curl "http://localhost:8787?code=test_code"
```

### Security Notes

- Never commit secrets to the repository
- The worker only accepts requests from the configured `ALLOWED_ORIGIN`
- Client secrets are stored securely in Cloudflare's secrets store
- The worker only handles the token exchange, not token storage

/**
 * GitHub OAuth Token Exchange Worker
 *
 * This Cloudflare Worker handles the OAuth token exchange for GitHub authentication.
 * GitHub Pages can't run server-side code, so this worker acts as a proxy to exchange
 * the OAuth authorization code for an access token.
 *
 * Environment Variables Required:
 * - GITHUB_CLIENT_ID: Your GitHub OAuth App Client ID
 * - GITHUB_CLIENT_SECRET: Your GitHub OAuth App Client Secret
 * - ALLOWED_ORIGIN: The origin allowed to call this worker (e.g., https://yourusername.github.io)
 */

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(env.ALLOWED_ORIGIN),
      });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405, env.ALLOWED_ORIGIN);
    }

    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    // Validate required parameters
    if (!code) {
      return jsonResponse({ error: 'Missing code parameter' }, 400, env.ALLOWED_ORIGIN);
    }

    // Validate environment configuration
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      return jsonResponse(
        { error: 'Server configuration error: Missing GitHub credentials' },
        500,
        env.ALLOWED_ORIGIN
      );
    }

    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code: code,
        }),
      });

      if (!tokenResponse.ok) {
        return jsonResponse(
          { error: `GitHub API error: ${tokenResponse.status}` },
          502,
          env.ALLOWED_ORIGIN
        );
      }

      const result = await tokenResponse.json();

      // Check for OAuth errors
      if (result.error) {
        return jsonResponse(
          {
            error: result.error,
            error_description: result.error_description || 'Unknown error',
          },
          400,
          env.ALLOWED_ORIGIN
        );
      }

      // Return the access token
      return jsonResponse(
        {
          access_token: result.access_token,
          token_type: result.token_type,
          scope: result.scope,
        },
        200,
        env.ALLOWED_ORIGIN
      );
    } catch (error) {
      console.error('Token exchange error:', error);
      return jsonResponse(
        { error: 'Failed to exchange token: ' + error.message },
        500,
        env.ALLOWED_ORIGIN
      );
    }
  },
};

// CORS headers helper
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// JSON response helper
function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

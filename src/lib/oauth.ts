// GitHub OAuth flow utilities

// OAuth configuration
// These values should be set via environment variables in production
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (import.meta as any).env || {};
const GITHUB_CLIENT_ID = env.VITE_GITHUB_CLIENT_ID || '';
const OAUTH_PROXY_URL = env.VITE_OAUTH_PROXY_URL || '';

// Required GitHub scopes for repo access
const SCOPES = ['repo', 'user:email'];

// State parameter for CSRF protection
const STATE_KEY = 'gh-fitness-oauth-state';

// Generate a random state for CSRF protection
function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Store state in sessionStorage for validation
function saveState(state: string): void {
  sessionStorage.setItem(STATE_KEY, state);
}

// Validate and clear state
function validateState(state: string): boolean {
  const savedState = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  return savedState === state;
}

// Get OAuth configuration status
export function getOAuthConfig(): { configured: boolean; clientId: string; proxyUrl: string } {
  return {
    configured: Boolean(GITHUB_CLIENT_ID && OAUTH_PROXY_URL),
    clientId: GITHUB_CLIENT_ID,
    proxyUrl: OAUTH_PROXY_URL,
  };
}

// Initiate OAuth flow by redirecting to GitHub
export function initiateOAuthFlow(): void {
  const { configured, clientId } = getOAuthConfig();

  if (!configured) {
    throw new Error('GitHub OAuth is not configured. Set VITE_GITHUB_CLIENT_ID and VITE_OAUTH_PROXY_URL.');
  }

  const state = generateState();
  saveState(state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${window.location.origin}/oauth/callback`,
    scope: SCOPES.join(' '),
    state,
  });

  window.location.href = `https://github.com/login/oauth/authorize?${params}`;
}

// Handle OAuth callback
export interface OAuthCallbackResult {
  success: boolean;
  accessToken?: string;
  error?: string;
}

export async function handleOAuthCallback(
  code: string,
  state: string
): Promise<OAuthCallbackResult> {
  // Validate state
  if (!validateState(state)) {
    return { success: false, error: 'Invalid state parameter (CSRF protection)' };
  }

  const { proxyUrl } = getOAuthConfig();

  try {
    // Exchange code for token via proxy
    const response = await fetch(`${proxyUrl}?code=${code}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `OAuth error: ${errorText}` };
    }

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error_description || data.error };
    }

    if (!data.access_token) {
      return { success: false, error: 'No access token received' };
    }

    return { success: true, accessToken: data.access_token };
  } catch (error) {
    return { success: false, error: `Network error: ${(error as Error).message}` };
  }
}

// Get user info from GitHub
export async function getGitHubUser(accessToken: string): Promise<{ login: string; email: string } | null> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) return null;

    const user = await response.json();
    return { login: user.login, email: user.email };
  } catch {
    return null;
  }
}

// List user's repos
export async function listUserRepos(
  accessToken: string
): Promise<Array<{ name: string; full_name: string; private: boolean }>> {
  try {
    const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) return [];

    return await response.json();
  } catch {
    return [];
  }
}

// Create a new repo for fitness data
export async function createFitnessRepo(
  accessToken: string,
  repoName: string = 'fitness-data'
): Promise<{ success: boolean; repo?: string; error?: string }> {
  try {
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        description: 'GitHub Fitness workout data',
        private: true,
        auto_init: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to create repo' };
    }

    const repo = await response.json();
    return { success: true, repo: repo.name };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

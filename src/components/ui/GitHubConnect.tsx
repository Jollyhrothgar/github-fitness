import { useState, useEffect } from 'react';
import { useSync } from '@/hooks/useSync';
import {
  getOAuthConfig,
  initiateOAuthFlow,
  listUserRepos,
  createFitnessRepo,
  getGitHubUser,
} from '@/lib/oauth';
import { getAuthConfig } from '@/lib/sync';
import type { GitHubAuthConfig } from '@/types/sync';

type SetupStep = 'initial' | 'select_repo' | 'connected' | 'manual';

interface RepoOption {
  name: string;
  full_name: string;
  private: boolean;
}

export function GitHubConnect() {
  const { syncState, configure, disconnect, sync } = useSync();
  const [step, setStep] = useState<SetupStep>('initial');
  const [repos, setRepos] = useState<RepoOption[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');

  // Manual entry fields
  const [manualToken, setManualToken] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const [manualRepo, setManualRepo] = useState('');

  const oauthConfig = getOAuthConfig();
  const authConfig = getAuthConfig();

  // Check if already connected
  useEffect(() => {
    if (authConfig) {
      setStep('connected');
      setUsername(authConfig.username);
      setSelectedRepo(authConfig.repo);
    }
  }, []);

  // Check for OAuth callback on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('access_token');
    const error = params.get('error');

    if (error) {
      setError(error);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (token) {
      handleOAuthSuccess(token);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleOAuthSuccess = async (token: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get user info
      const user = await getGitHubUser(token);
      if (!user) {
        setError('Failed to get user info');
        return;
      }

      setAccessToken(token);
      setUsername(user.login);

      // Fetch repos
      const userRepos = await listUserRepos(token);
      setRepos(userRepos);
      setStep('select_repo');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    if (oauthConfig.configured) {
      initiateOAuthFlow();
    } else {
      // Fall back to manual entry
      setStep('manual');
    }
  };

  const handleSelectRepo = async () => {
    if (!accessToken || !selectedRepo) return;

    setIsLoading(true);
    setError(null);

    try {
      const config: GitHubAuthConfig = {
        accessToken,
        username,
        repo: selectedRepo,
      };

      configure(config);
      setStep('connected');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRepo = async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await createFitnessRepo(accessToken);
      if (!result.success) {
        setError(result.error || 'Failed to create repo');
        return;
      }

      // Refresh repos and select the new one
      const userRepos = await listUserRepos(accessToken);
      setRepos(userRepos);
      setSelectedRepo(result.repo || 'fitness-data');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualConnect = async () => {
    if (!manualToken || !manualUsername || !manualRepo) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const config: GitHubAuthConfig = {
        accessToken: manualToken,
        username: manualUsername,
        repo: manualRepo,
      };

      configure(config);
      setStep('connected');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setStep('initial');
    setAccessToken(null);
    setUsername('');
    setSelectedRepo('');
    setRepos([]);
  };

  // Render based on step
  if (step === 'connected') {
    return (
      <div className="bg-surface rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">GitHub Sync</h3>
          <span className="text-success text-sm flex items-center gap-1">
            <span>✓</span> Connected
          </span>
        </div>

        <div className="space-y-2 text-sm text-text-secondary">
          <div className="flex justify-between">
            <span>Account:</span>
            <span className="font-mono">{authConfig?.username}</span>
          </div>
          <div className="flex justify-between">
            <span>Repository:</span>
            <span className="font-mono">{authConfig?.repo}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={syncState.status === 'idle' ? 'text-success' : 'text-warning'}>
              {syncState.status}
            </span>
          </div>
          {syncState.lastSyncTime && (
            <div className="flex justify-between">
              <span>Last sync:</span>
              <span>{syncState.lastSyncTime.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => sync()}
            disabled={syncState.status === 'syncing'}
            className="flex-1 py-2 px-4 bg-primary text-white rounded-lg disabled:opacity-50"
          >
            {syncState.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
          </button>
          <button
            onClick={handleDisconnect}
            className="py-2 px-4 bg-surface-elevated text-error rounded-lg"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  if (step === 'select_repo') {
    return (
      <div className="bg-surface rounded-lg p-4 space-y-4">
        <h3 className="font-medium">Select Repository</h3>
        <p className="text-sm text-text-secondary">
          Connected as <span className="font-mono">{username}</span>. Select a repository for your
          fitness data:
        </p>

        {error && (
          <div className="text-sm text-error bg-error/10 p-2 rounded">{error}</div>
        )}

        <select
          value={selectedRepo}
          onChange={(e) => setSelectedRepo(e.target.value)}
          className="w-full p-2 bg-surface-elevated rounded-lg border border-surface-hover"
        >
          <option value="">Select a repository...</option>
          {repos.map((repo) => (
            <option key={repo.full_name} value={repo.name}>
              {repo.name} {repo.private ? '(private)' : '(public)'}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            onClick={handleSelectRepo}
            disabled={!selectedRepo || isLoading}
            className="flex-1 py-2 px-4 bg-primary text-white rounded-lg disabled:opacity-50"
          >
            {isLoading ? 'Connecting...' : 'Connect'}
          </button>
          <button
            onClick={handleCreateRepo}
            disabled={isLoading}
            className="py-2 px-4 bg-surface-elevated text-text-secondary rounded-lg"
          >
            Create New
          </button>
        </div>

        <button
          onClick={() => setStep('initial')}
          className="w-full py-2 text-sm text-text-muted"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (step === 'manual') {
    return (
      <div className="bg-surface rounded-lg p-4 space-y-4">
        <h3 className="font-medium">Manual GitHub Setup</h3>
        <p className="text-sm text-text-secondary">
          Enter your GitHub Personal Access Token and repository details:
        </p>

        {error && (
          <div className="text-sm text-error bg-error/10 p-2 rounded">{error}</div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-sm text-text-secondary block mb-1">
              Personal Access Token
            </label>
            <input
              type="password"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="ghp_..."
              className="w-full p-2 bg-surface-elevated rounded-lg border border-surface-hover font-mono text-sm"
            />
            <p className="text-xs text-text-muted mt-1">
              Create at{' '}
              <a
                href="https://github.com/settings/tokens/new?scopes=repo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                GitHub Settings
              </a>{' '}
              with "repo" scope
            </p>
          </div>

          <div>
            <label className="text-sm text-text-secondary block mb-1">Username</label>
            <input
              type="text"
              value={manualUsername}
              onChange={(e) => setManualUsername(e.target.value)}
              placeholder="your-username"
              className="w-full p-2 bg-surface-elevated rounded-lg border border-surface-hover"
            />
          </div>

          <div>
            <label className="text-sm text-text-secondary block mb-1">Repository Name</label>
            <input
              type="text"
              value={manualRepo}
              onChange={(e) => setManualRepo(e.target.value)}
              placeholder="fitness-data"
              className="w-full p-2 bg-surface-elevated rounded-lg border border-surface-hover"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleManualConnect}
            disabled={isLoading}
            className="flex-1 py-2 px-4 bg-primary text-white rounded-lg disabled:opacity-50"
          >
            {isLoading ? 'Connecting...' : 'Connect'}
          </button>
          <button
            onClick={() => setStep('initial')}
            className="py-2 px-4 bg-surface-elevated text-text-secondary rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Initial state
  return (
    <div className="bg-surface rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">GitHub Sync</h3>
        <span className="text-text-muted text-sm">Not connected</span>
      </div>

      <p className="text-sm text-text-secondary">
        Sync your workout data to a GitHub repository for backup and multi-device access.
      </p>

      {error && (
        <div className="text-sm text-error bg-error/10 p-2 rounded">{error}</div>
      )}

      <div className="space-y-2">
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="w-full py-2 px-4 bg-primary text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          {oauthConfig.configured ? 'Connect with GitHub' : 'Setup GitHub Sync'}
        </button>

        {oauthConfig.configured && (
          <button
            onClick={() => setStep('manual')}
            className="w-full py-2 text-sm text-text-muted underline"
          >
            Use Personal Access Token instead
          </button>
        )}
      </div>
    </div>
  );
}

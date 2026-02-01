import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleOAuthCallback, getGitHubUser } from '@/lib/oauth';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setStatus('error');
        setError(searchParams.get('error_description') || errorParam);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setError('Missing authorization code or state');
        return;
      }

      // Exchange code for token
      const result = await handleOAuthCallback(code, state);

      if (!result.success || !result.accessToken) {
        setStatus('error');
        setError(result.error || 'Failed to get access token');
        return;
      }

      // Get user info
      const user = await getGitHubUser(result.accessToken);
      if (!user) {
        setStatus('error');
        setError('Failed to get user information');
        return;
      }

      setStatus('success');

      // Redirect to settings with token in URL (will be picked up by GitHubConnect)
      navigate(`/settings?access_token=${result.accessToken}`, { replace: true });
    };

    processCallback();
  }, [searchParams, navigate]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Connecting to GitHub...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-error text-2xl">!</span>
          </div>
          <h1 className="text-xl font-bold mb-2">Connection Failed</h1>
          <p className="text-text-secondary mb-4">{error}</p>
          <button
            onClick={() => navigate('/settings')}
            className="px-6 py-2 bg-primary text-white rounded-lg"
          >
            Return to Settings
          </button>
        </div>
      </div>
    );
  }

  return null;
}

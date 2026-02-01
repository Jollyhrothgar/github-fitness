// GitHub API client for fitness data sync

import type { GitHubFileContent, GitHubCommitResponse, GitHubTreeEntry } from '@/types/sync';

const GITHUB_API_BASE = 'https://api.github.com';

export interface GitHubClientConfig {
  accessToken: string;
  owner: string;
  repo: string;
}

export class GitHubClient {
  private config: GitHubClientConfig;

  constructor(config: GitHubClientConfig) {
    this.config = config;
  }

  private get headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.config.accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }

  private get repoPath(): string {
    return `${this.config.owner}/${this.config.repo}`;
  }

  // Check if user is authenticated and has repo access
  async verifyAccess(): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${this.repoPath}`,
        { headers: this.headers }
      );

      if (response.ok) {
        return { valid: true };
      }

      if (response.status === 401) {
        return { valid: false, error: 'Invalid or expired access token' };
      }

      if (response.status === 404) {
        return { valid: false, error: 'Repository not found or no access' };
      }

      return { valid: false, error: `GitHub API error: ${response.status}` };
    } catch (error) {
      return { valid: false, error: `Network error: ${(error as Error).message}` };
    }
  }

  // Get file contents from repo
  async getFile(path: string): Promise<GitHubFileContent | null> {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${this.repoPath}/contents/${path}`,
        { headers: this.headers }
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get file: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${path}:`, error);
      throw error;
    }
  }

  // Get decoded file content (handles base64 decoding)
  async getFileContent<T>(path: string): Promise<T | null> {
    const file = await this.getFile(path);
    if (!file || !file.content) return null;

    const content = atob(file.content.replace(/\n/g, ''));
    return JSON.parse(content) as T;
  }

  // Get raw file content as string (for JSONL files)
  async getFileContentRaw(path: string): Promise<string | null> {
    const file = await this.getFile(path);
    if (!file || !file.content) return null;

    return atob(file.content.replace(/\n/g, ''));
  }

  // List directory contents
  async listDirectory(path: string): Promise<GitHubFileContent[]> {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${this.repoPath}/contents/${path}`,
        { headers: this.headers }
      );

      if (response.status === 404) {
        return [];
      }

      if (!response.ok) {
        throw new Error(`Failed to list directory: ${response.status}`);
      }

      const contents = await response.json();
      return Array.isArray(contents) ? contents : [contents];
    } catch (error) {
      console.error(`Error listing ${path}:`, error);
      return [];
    }
  }

  // Create or update a file
  async putFile(
    path: string,
    content: string,
    message: string,
    existingSha?: string
  ): Promise<GitHubCommitResponse> {
    // Get existing file SHA if not provided
    let sha = existingSha;
    if (!sha) {
      const existingFile = await this.getFile(path);
      sha = existingFile?.sha;
    }

    const body: Record<string, string> = {
      message,
      content: btoa(unescape(encodeURIComponent(content))), // Handle Unicode
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${this.repoPath}/contents/${path}`,
      {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to put file: ${error.message || response.status}`);
    }

    return await response.json();
  }

  // Append to a file (for JSONL log files)
  async appendToFile(path: string, line: string, message: string): Promise<GitHubCommitResponse> {
    const existingFile = await this.getFile(path);
    let content = '';

    if (existingFile?.content) {
      content = atob(existingFile.content.replace(/\n/g, ''));
      if (!content.endsWith('\n')) {
        content += '\n';
      }
    }

    content += line + '\n';

    return this.putFile(path, content, message, existingFile?.sha);
  }

  // Delete a file
  async deleteFile(path: string, message: string): Promise<void> {
    const file = await this.getFile(path);
    if (!file) return;

    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${this.repoPath}/contents/${path}`,
      {
        method: 'DELETE',
        headers: this.headers,
        body: JSON.stringify({
          message,
          sha: file.sha,
        }),
      }
    );

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete file: ${response.status}`);
    }
  }

  // Get directory tree (recursive)
  async getTree(path: string = ''): Promise<GitHubTreeEntry[]> {
    try {
      // First get the default branch
      const repoResponse = await fetch(
        `${GITHUB_API_BASE}/repos/${this.repoPath}`,
        { headers: this.headers }
      );

      if (!repoResponse.ok) {
        throw new Error(`Failed to get repo info: ${repoResponse.status}`);
      }

      const repo = await repoResponse.json();
      const branch = repo.default_branch || 'main';

      // Get the tree
      const treeResponse = await fetch(
        `${GITHUB_API_BASE}/repos/${this.repoPath}/git/trees/${branch}?recursive=1`,
        { headers: this.headers }
      );

      if (!treeResponse.ok) {
        throw new Error(`Failed to get tree: ${treeResponse.status}`);
      }

      const treeData = await treeResponse.json();
      let entries: GitHubTreeEntry[] = treeData.tree || [];

      // Filter by path prefix if specified
      if (path) {
        entries = entries.filter((e: GitHubTreeEntry) => e.path.startsWith(path));
      }

      return entries;
    } catch (error) {
      console.error('Error getting tree:', error);
      return [];
    }
  }

  // Ensure data directory structure exists
  async ensureDataStructure(): Promise<void> {
    const paths = ['data', 'data/logs', 'data/plans'];

    for (const dirPath of paths) {
      const exists = await this.getFile(`${dirPath}/.gitkeep`);
      if (!exists) {
        await this.putFile(
          `${dirPath}/.gitkeep`,
          '',
          `Initialize ${dirPath} directory`
        );
      }
    }
  }
}

// Factory function for creating client
export function createGitHubClient(
  accessToken: string,
  owner: string,
  repo: string
): GitHubClient {
  return new GitHubClient({ accessToken, owner, repo });
}

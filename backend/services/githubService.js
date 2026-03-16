const axios = require('axios');

class GitHubService {
  constructor(token) {
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
  }

  async listRepos(perPage = 50) {
    const res = await this.client.get('/user/repos', {
      params: { sort: 'updated', per_page: perPage, affiliation: 'owner,collaborator' },
    });
    return res.data;
  }

  async getRepo(owner, repo) {
    const res = await this.client.get(`/repos/${owner}/${repo}`);
    return res.data;
  }

  async listPRs(owner, repo, state = 'open') {
    const res = await this.client.get(`/repos/${owner}/${repo}/pulls`, {
      params: { state, per_page: 20, sort: 'updated' },
    });
    return res.data;
  }

  async getPRDiff(owner, repo, prNumber) {
    try {
      const res = await this.client.get(`/repos/${owner}/${repo}/pulls/${prNumber}`, {
        headers: { Accept: 'application/vnd.github.v3.diff' },
      });
      return res.data;
    } catch (e) {
      if (e.response?.status === 404) throw new Error(`Pull request #${prNumber} not found in ${owner}/${repo}`);
      throw new Error(`Failed to fetch PR diff: ${e.response?.data?.message || e.message}`);
    }
  }

  async getPRFiles(owner, repo, prNumber) {
    try {
      const res = await this.client.get(`/repos/${owner}/${repo}/pulls/${prNumber}/files`);
      return res.data;
    } catch (e) {
      if (e.response?.status === 404) throw new Error(`Pull request #${prNumber} files not found in ${owner}/${repo}`);
      throw new Error(`Failed to fetch PR files: ${e.response?.data?.message || e.message}`);
    }
  }

  async getFileContent(owner, repo, path, ref) {
    const res = await this.client.get(`/repos/${owner}/${repo}/contents/${path}`, {
      params: ref ? { ref } : {},
    });
    return Buffer.from(res.data.content, 'base64').toString('utf8');
  }

  async createWebhook(owner, repo, webhookUrl, secret) {
    const res = await this.client.post(`/repos/${owner}/${repo}/hooks`, {
      name: 'web',
      active: true,
      events: ['pull_request', 'push'],
      config: {
        url: webhookUrl,
        content_type: 'json',
        insecure_ssl: '0',
        secret,
      },
    });
    return res.data;
  }

  async deleteWebhook(owner, repo, hookId) {
    await this.client.delete(`/repos/${owner}/${repo}/hooks/${hookId}`);
  }

  async createPRReview(owner, repo, prNumber, body, comments = []) {
    const res = await this.client.post(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, {
      body,
      event: 'COMMENT',
      comments,
    });
    return res.data;
  }

  async getCommitDiff(owner, repo, sha) {
    const res = await this.client.get(`/repos/${owner}/${repo}/commits/${sha}`, {
      headers: { Accept: 'application/vnd.github.v3.diff' },
    });
    return res.data;
  }

  // Get a recursive tree of the repository at a ref (branch or commit sha)
  async getRepoTree(owner, repo, ref = 'HEAD') {
    const res = await this.client.get(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}`, {
      params: { recursive: 1 },
    });
    return res.data;
  }

  async searchUserRepos(query) {
    let username;
    try {
      // Get the authenticated user's login to scope the search to their account
      const userRes = await this.client.get('/user');
      username = userRes.data.login;
      
      const res = await this.client.get('/search/repositories', {
        // Search by repo name within the user's account
        params: { q: `${query} user:${username} in:name`, per_page: 15 },
      });
      return res.data;
    } catch (error) {
      // Fallback to a global search if scoping fails, or return error if fallback fails
      try {
        const fallbackRes = await this.client.get('/search/repositories', {
          params: { q: `${query} in:name`, per_page: 15 },
        });
        return fallbackRes.data;
      } catch (fallbackError) {
        throw new Error(
          fallbackError.response?.data?.message || 
          error.response?.data?.message || 
          'Failed to search GitHub repositories'
        );
      }
    }
  }

  // Get a reference object for a branch (head)
  async getRef(owner, repo, ref = 'heads/main') {
    const res = await this.client.get(`/repos/${owner}/${repo}/git/ref/${ref}`);
    return res.data;
  }

  async createRef(owner, repo, refName, sha) {
    const res = await this.client.post(`/repos/${owner}/${repo}/git/refs`, {
      ref: `refs/heads/${refName}`,
      sha,
    });
    return res.data;
  }

  // Create or update a file on a branch using the Contents API
  async createOrUpdateFile(owner, repo, path, content, branch, message) {
    const encoded = Buffer.from(content, 'utf8').toString('base64');
    // Try to fetch the existing file to obtain sha for update
    let sha;
    try {
      const getRes = await this.client.get(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, { params: { ref: branch } });
      sha = getRes.data.sha;
    } catch (e) {
      // file may not exist; continue to create
    }
    const body = {
      message: message || `Apply automated change: ${path}`,
      content: encoded,
      branch,
    };
    if (sha) body.sha = sha;
    const res = await this.client.put(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, body);
    return res.data;
  }

  async createPullRequest(owner, repo, title, head, base, body) {
    const res = await this.client.post(`/repos/${owner}/${repo}/pulls`, {
      title,
      head,
      base,
      body: body || '',
    });
    return res.data;
  }
}

module.exports = GitHubService;

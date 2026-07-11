// aiServices.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ─── OpenRouter Configuration ────────────────────────────────────────────────
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

// Rate limiting
const ratelimitResetTime = 60 * 1000; // 1 minute
const MAX_API_CALLS_PER_MINUTE = 5;
let apiCalls = 0;
let lastResetTime = Date.now();

/**
 * Make a chat completion request to OpenRouter API.
 * OpenRouter uses an OpenAI-compatible format.
 */
async function callOpenRouter(messages, { model, maxTokens = 4000, temperature = 0.2 } = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set in environment variables');

  let response;
  try {
    response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: model || DEFAULT_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
          'X-Title': 'CodeRev AI',
        },
        timeout: 120000, // 2 min timeout for long AI responses
      }
    );
  } catch (err) {
    if (err.response?.status === 401) {
      throw new Error('OpenRouter API Key is invalid or missing. Please configure OPENROUTER_API_KEY in backend/.env');
    }
    throw new Error(`OpenRouter API error: ${err.response?.data?.error?.message || err.message}`);
  }

  const choice = response.data?.choices?.[0];
  if (!choice) throw new Error('OpenRouter returned no choices');
  let content = choice.message?.content;
  // If the model returned a structured object, stringify it for downstream parsing/logging
  if (content && typeof content === 'object') {
    try { content = JSON.stringify(content); } catch (e) { content = String(content); }
  }

  if (!content || (typeof content === 'string' && content.trim() === '')) {
    // preserve full response for debugging when model returns an empty content field
    try {
      return JSON.stringify(response.data);
    } catch (e) {
      return '';
    }
  }
  return content;
}

/**
 * Extract JSON from a text response (handles markdown code fences too).
 */
function extractJSON(text) {
  // 1) Try fenced ```json blocks (common when model responds with markdown)
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch (e) {
      // fall through to more permissive extraction
    }
  }

  // 2) Try to locate a balanced JSON object starting at the first '{'
  const firstBrace = text.indexOf('{');
  if (firstBrace !== -1) {
    let depth = 0;
    for (let i = firstBrace; i < text.length; i++) {
      const ch = text[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth === 0) {
        const candidate = text.slice(firstBrace, i + 1);
        try { return JSON.parse(candidate); } catch (e) { break; }
      }
    }
  }

  // 3) Try to find a top-level JSON array
  const firstBracket = text.indexOf('[');
  if (firstBracket !== -1) {
    let depth = 0;
    for (let i = firstBracket; i < text.length; i++) {
      const ch = text[i];
      if (ch === '[') depth++;
      else if (ch === ']') depth--;
      if (depth === 0) {
        const candidate = text.slice(firstBracket, i + 1);
        try { return JSON.parse(candidate); } catch (e) { break; }
      }
    }
  }

  const json_match = text.match(/({[\s\S]*})/);
  if (json_match) {
    try { return JSON.parse(json_match[1]); } catch (e) { /* fall through */ }
  }



  // 4) As a last resort, try a loose regex but non-greedy: grab the first { ... } block
  const loose = text.match(/\{[\s\S]*?\}/);
  if (loose) {
    try { return JSON.parse(loose[0]); } catch (e) { /* fall through */ }
  }

  // If we get here, give a helpful error with a snippet of the model output for debugging
  const snippet = (text || '').substring(0, 400).replace(/\s+/g, ' ');
  throw new Error(`AI returned invalid JSON. Response snippet: ${snippet}`);
}

// Temporary server-side logging for raw AI responses
function logRawAIResponse(tag, text, err) {
  try {
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const file = path.join(logDir, 'ai_responses.log');
    const entry = [`--- ${new Date().toISOString()} [${tag}] ---`, text || '', err ? `ERROR: ${err}` : '', '\n'].join('\n');
    fs.appendFileSync(file, entry);
  } catch (e) {
    console.warn('Failed to write AI log', e.message);
  }
}

// Heuristic to extract a short, human-friendly summary from a raw AI response
function cleanSummaryFromText(text, maxLen = 300) {
  if (!text) return 'No summary generated';
  try {
    // If the response is valid JSON, try to extract natural-language fields first
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) { parsed = null; }

    if (parsed && typeof parsed === 'object') {
      const candidates = [];
      const pushIf = (v) => { if (v && typeof v === 'string' && v.trim().length > 10) candidates.push(v.trim()); };
      // Common fields that may contain a short human summary
      pushIf(parsed.summary || parsed.summary_text || parsed.overview || parsed.message || parsed.result || parsed.conclusion || parsed.description);
      // If issues array exists, summarise their titles
      if (Array.isArray(parsed.issues) && parsed.issues.length) {
        pushIf(parsed.issues.slice(0,3).map(i => i.title || i.description || i.file).join(' | '));
      }
      if (candidates.length > 0) {
        const s = candidates[0].replace(/\s+/g, ' ');
        return s.length > maxLen ? s.slice(0, maxLen).trim() + '…' : s;
      }
      // Fallback: stringify a compact view of the object
      text = JSON.stringify(parsed, null, 2);
    }

    // Remove markdown code fences and their contents
    text = text.replace(/```[\s\S]*?```/g, '');

    // Remove common metadata lines (id:, model:, object:, created:)
    text = text.split('\n').filter(line => !/^(\s*(id|model|object|created|provid)).*[:=]/i.test(line.trim())).join(' ');

    // Collapse whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Try to extract a quoted message field if present
    const msgMatch = text.match(/(\"message\"\s*:\s*\"([^\"]{20,})\")/i) || text.match(/message\s*[:=]\s*"([^\"]{20,})"/i);
    if (msgMatch) text = msgMatch[2] || msgMatch[1];

    const sentences = text.match(/[^.!?]+[.!?]?/g) || [text];
    const summary = sentences.slice(0, 2).map(s => s.trim()).join(' ').replace(/\s+/g, ' ');
    if (!summary) return 'AI returned a response but no summary';
    return summary.length > maxLen ? summary.slice(0, maxLen).trim() + '…' : summary;
  } catch (e) {
    return 'AI returned a response but no summary';
  }
}

// ─── Review System Prompt ────────────────────────────────────────────────────
const REVIEW_SYSTEM_PROMPT = `You are an expert code reviewer with deep knowledge of security, performance, and best practices across all major programming languages. 

Your task is to review code diffs and provide structured, actionable feedback. Be precise, concise, and helpful.

When reviewing, focus on:
1. BUGS — Logic errors, null pointer issues, edge cases
2. SECURITY — OWASP Top 10, injection, XSS, CSRF, secrets exposure, insecure dependencies  
3. PERFORMANCE — N+1 queries, memory leaks, inefficient algorithms, unnecessary re-renders
4. BEST PRACTICES — SOLID principles, DRY, naming, error handling
5. COMPLEXITY — Overly complex functions, missing abstractions

Always respond with valid JSON matching the exact schema provided.`;

// ─── Core AI Functions ───────────────────────────────────────────────────────

async function runAIReview({ diff, repoContext, styleGuide, files }) {
  const userPrompt = `Review this code diff and provide structured feedback.

Repository context:
${repoContext || 'No additional context provided'}

Custom style guide rules:
${styleGuide || 'Use general best practices'}

Code diff to review:
\`\`\`diff
${diff.substring(0, 15000)} 
\`\`\`

Respond with ONLY valid JSON in this exact schema:
{
  "summary": "2-3 sentence overall assessment",
  "rating": <0-100 integer, 100 = best quality>,
  "suggestedChanges": [
    { "type": "security|performance|refactor|test|style", "title": "short", "description": "detailed", "codeExample": "optional code snippet" }
  ],
  "riskScore": <0-100 integer, 100 = most risky>,
  "riskFactors": {
    "blastRadius": <number of files affected>,
    "complexity": <complexity delta 0-10>,
    "churnScore": <0-10>,
    "securityFlags": <count of security issues>
  },
  "issues": [
    {
      "file": "path/to/file.js",
      "line": <line number>,
      "endLine": <optional end line>,
      "category": "bug|security|performance|style|best-practice|test|complexity",
      "severity": "error|warning|info",
      "title": "Short title",
      "description": "Detailed explanation of the issue",
      "suggestion": "How to fix it",
      "patchCode": "Ready-to-use fixed code snippet (optional)",
      "owaspCategory": "A01-A10 if applicable (optional)",
      "cweid": "CWE-XXX if applicable (optional)"
    }
  ],
  "secretsDetected": [
    {
      "file": "path",
      "line": <line>,
      "type": "API_KEY|PASSWORD|TOKEN|etc",
      "masked": "sk-****"
    }
  ],
  "suggestedTests": [
    {
      "functionName": "name",
      "testCode": "test code here",
      "framework": "jest|mocha|etc"
    }
  ],
  "complianceFlags": []
}`;

  const messages = [
    { role: 'system', content: REVIEW_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];

  let text = await callOpenRouter(messages);
  let parsed;
  try {
    parsed = extractJSON(text);
  } catch (err) {
    console.warn('AI review returned invalid JSON, attempting repair');
    console.warn(text && text.substring ? text.substring(0, 1000) : text);
    logRawAIResponse('runAIReview:initial', text, err && err.message);

    // Attempt a repair by asking the model to re-emit only the valid JSON
    try {
      const repairPrompt = [
        { role: 'system', content: REVIEW_SYSTEM_PROMPT },
        { role: 'user', content: `The previous response could not be parsed as JSON. Here is the raw output:\n\n${text}\n\nPlease respond with ONLY valid JSON that matches the schema previously requested. Do not include any explanatory text.` },
      ];
      const repairedText = await callOpenRouter(repairPrompt, { maxTokens: 2000 });
      try {
        parsed = extractJSON(repairedText);
      } catch (e2) {
        console.warn('Repair attempt failed to produce valid JSON');
        logRawAIResponse('runAIReview:repair', repairedText, `${err && err.message} | ${e2 && e2.message}`);
        // fall through to returning fallback object
        text = (repairedText && repairedText.length < 20000) ? repairedText : text;
        parsed = {
          summary: cleanSummaryFromText(text, 400) || 'AI returned an unparsable response',
          riskScore: null,
          riskFactors: null,
          issues: [],
          secretsDetected: [],
          suggestedTests: [],
          complianceFlags: [],
          _rawAIResponse: text,
          _rawAIError: err.message + ' | repair: ' + (e2 && e2.message),
        };
      }
    } catch (repairErr) {
      console.warn('Error during repair attempt', repairErr.message);
      logRawAIResponse('runAIReview:repair-call-failed', text, `${err && err.message} | ${repairErr && repairErr.message}`);
      parsed = {
        summary: cleanSummaryFromText(text, 400) || 'AI returned an unparsable response',
        riskScore: null,
        riskFactors: null,
        issues: [],
        secretsDetected: [],
        suggestedTests: [],
        complianceFlags: [],
        _rawAIResponse: text,
        _rawAIError: err.message + ' | repair-call-failed: ' + repairErr.message,
      };
    }
  }

  // Ensure we always return a helpful summary when possible
  try {
    parsed = parsed || {};
    if (!parsed.summary || String(parsed.summary).trim() === '') {
      const issues = parsed.issues || [];
      if (issues.length > 0) {
        const top = issues.slice(0, 3).map(i => i.title || i.description || i.file || 'issue').join(' | ');
        parsed.summary = `${issues.length} issue${issues.length > 1 ? 's' : ''} found — ${top}`;
      } else if (parsed._rawAIError) {
        parsed.summary = `AI parse error: ${parsed._rawAIError}`;
      } else if (text && String(text).trim()) {
        parsed.summary = cleanSummaryFromText(text, 400);
        parsed._rawAIResponse = parsed._rawAIResponse || text;
      } else {
        parsed.summary = 'No summary generated';
      }
    }
    parsed._rawAIResponse = parsed._rawAIResponse || text;
  } catch (e) {
    // ensure function never throws here
    parsed = parsed || { summary: 'No summary generated', issues: [] };
  }

  return parsed;
}

async function generateAutoFix({ issue, fileContent, language }) {
  const messages = [
    {
      role: 'user',
      content: `Generate a minimal, surgical code fix for this issue:

Issue: ${issue.title}
Description: ${issue.description}
File: ${issue.file}
Line: ${issue.line}
Language: ${language || 'javascript'}

Current code context:
\`\`\`
${fileContent}
\`\`\`

Respond with ONLY the fixed code snippet (not the whole file, just the relevant section), no explanation.`,
    },
  ];

  return await callOpenRouter(messages, { maxTokens: 1000 });
}

// Generate a suggested change code snippet for a high-level suggestion
async function generateSuggestedChange({ suggestion, files = [], repoName }) {
  const messages = [
    { role: 'system', content: REVIEW_SYSTEM_PROMPT },
    { role: 'user', content: `You are given a repository snapshot and a suggested change request.\n\nSuggestion:\n${suggestion.title}\n\nDescription:\n${suggestion.description}\n\nFiles (sample):\n${(files || []).slice(0,20).map(f=>`FILE: ${f.path}\n${f.content.substring(0,800)}`).join('\n\n')}
\n\nPlease respond with ONLY a JSON object: { "filePath": "path/to/file", "patch": "code or diff snippet" }` },
  ];

  const text = await callOpenRouter(messages, { maxTokens: 1500 });
  try {
    return extractJSON(text);
  } catch (e) {
    // fallback: return raw text
    return { filePath: `autofix/${Date.now()}.txt`, patch: text };
  }
}

async function analyzeCodebaseMemory({ repoName, recentDiffs, existingMemory }) {
  const messages = [
    {
      role: 'user',
      content: `Analyze these recent code diffs from the "${repoName}" repository and extract recurring patterns.

Existing memory: ${JSON.stringify(existingMemory || {})}

Recent diffs sample:
${recentDiffs.join('\n---\n').substring(0, 8000)}

Return JSON:
{
  "patterns": [{"pattern": "description", "frequency": <count>}],
  "namingConventions": ["camelCase for variables", "PascalCase for components"],
  "architectureNotes": "Brief notes about the codebase architecture"
}`,
    },
  ];

  const text = await callOpenRouter(messages, { maxTokens: 1000 });
  try {
    return extractJSON(text);
  } catch (e) {
    return {};
  }
}

// ─── Repo-Wide Review ────────────────────────────────────────────────────────

async function runRepoReview({ repoName, files = [], repoContext = '', styleGuide = '' }) {
  const maxPerChunk = 120000; // chars per chunk to keep prompt size reasonable

  // Build chunks of file contents
  const chunks = [];
  let current = '';
  for (const f of files) {
    const entry = `\n\n// FILE: ${f.path}\n\n${f.content.substring(0, 20000)}`;
    if ((current + entry).length > maxPerChunk) {
      chunks.push(current);
      current = entry;
    } else {
      current += entry;
    }
  }
  if (current) chunks.push(current);

  // Run reviews per chunk and merge results
    const aggregated = {
    summary: '',
    riskScore: null,
    riskFactors: { blastRadius: 0, complexity: 0, churnScore: 0, securityFlags: 0 },
    issues: [],
    secretsDetected: [],
    suggestedTests: [],
    complianceFlags: [],
    rawAIResponses: [],
    suggestedChanges: [],
    ratings: [],
  };

  for (const chunk of chunks) {
    const messages = [
      { role: 'system', content: REVIEW_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Repository: ${repoName}\nRepository context:\n${repoContext || 'None'}\nStyle guide:\n${styleGuide || 'Default'}\n\nFiles snapshot:\n\n${chunk}\n\nPlease review these files and return a single JSON matching the schema used by runAIReview (summary, riskScore, riskFactors, issues, secretsDetected, suggestedTests, complianceFlags).`,
      },
    ];

    const text = await callOpenRouter(messages);
    let part = {};
    try {
      part = extractJSON(text);
    } catch (e) {
      console.warn('runRepoReview: failed to parse AI JSON for a chunk, saving raw response');
      logRawAIResponse('runRepoReview:chunk', text, e && e.message);
      part = {
        summary: 'AI failed to return valid JSON for this chunk',
        riskScore: 0,
        riskFactors: { blastRadius: 0, complexity: 0, churnScore: 0, securityFlags: 0 },
        issues: [],
        secretsDetected: [],
        suggestedTests: [],
        complianceFlags: [],
        _rawAIResponse: text,
        _rawAIError: e.message,
      };
    }

    // Merge results
    aggregated.summary += (part.summary ? part.summary + ' ' : '');
    // Merge riskScore only when part provides a numeric value
    if (typeof part.riskScore === 'number') {
      aggregated.riskScore = (typeof aggregated.riskScore === 'number') ? Math.max(aggregated.riskScore, part.riskScore) : part.riskScore;
    }
    if (part.riskFactors) {
      aggregated.riskFactors.blastRadius += (part.riskFactors?.blastRadius || 0);
      aggregated.riskFactors.complexity += (part.riskFactors?.complexity || 0);
      aggregated.riskFactors.churnScore += (part.riskFactors?.churnScore || 0);
      aggregated.riskFactors.securityFlags += (part.riskFactors?.securityFlags || 0);
    }
    aggregated.issues.push(...(part.issues || []));
    aggregated.secretsDetected.push(...(part.secretsDetected || []));
    aggregated.suggestedTests.push(...(part.suggestedTests || []));
    aggregated.complianceFlags.push(...(part.complianceFlags || []));
    if (part._rawAIResponse) aggregated.rawAIResponses.push(part._rawAIResponse);
    if (part._rawAIError) aggregated.rawAIResponses.push(`ERROR: ${part._rawAIError}`);
    if (part.suggestedChanges) aggregated.suggestedChanges.push(...(part.suggestedChanges || []));
    if (typeof part.rating === 'number') aggregated.ratings.push(part.rating);
  }

  // Trim summary
  aggregated.summary = aggregated.summary.trim().slice(0, 600);
  aggregated.totalIssues = aggregated.issues.length;
  if (aggregated.rawAIResponses.length) aggregated.rawAIResponse = aggregated.rawAIResponses.join('\n\n---\n\n').slice(0, 16000);
  if (aggregated.ratings.length) {
    const sum = aggregated.ratings.reduce((a,b) => a + b, 0);
    aggregated.aiRating = Math.round(sum / aggregated.ratings.length);
  }
  if (aggregated.suggestedChanges.length) aggregated.suggestedChanges = aggregated.suggestedChanges.slice(0, 200);
  return aggregated;
}

// Helper to parse raw AI response text into the standard parsed object used by runAIReview
async function parseRawAIResponse(text) {
  if (!text) return null;
  try {
    const parsed = extractJSON(text);
    // ensure summary exists
    if (!parsed.summary || String(parsed.summary).trim() === '') {
      parsed.summary = cleanSummaryFromText(text, 400);
    }
    parsed._rawAIResponse = parsed._rawAIResponse || text;
    return parsed;
  } catch (e) {
    return {
      summary: cleanSummaryFromText(text, 400) || 'AI returned an unparsable response',
      riskScore: null,
      riskFactors: null,
      issues: [],
      secretsDetected: [],
      suggestedTests: [],
      complianceFlags: [],
      _rawAIResponse: text,
      _rawAIError: e.message,
    };
  }
}

module.exports = {
  runAIReview,
  generateAutoFix,
  analyzeCodebaseMemory,
  runRepoReview,
  generateSuggestedChange,
  parseRawAIResponse,
};

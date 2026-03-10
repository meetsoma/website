/**
 * Fetch community content from meetsoma/community GitHub repo.
 * Runs before build to keep website/community/ in sync.
 *
 * Uses GitHub API (no auth needed for public repos).
 * Falls back to existing local copy if fetch fails.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMMUNITY_DIR = path.resolve(__dirname, '../community');
const REPO = 'meetsoma/community';
const BRANCH = 'main';
const DIRS = ['protocols', 'muscles', 'skills', 'templates'];

const API_BASE = `https://api.github.com/repos/${REPO}`;

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'soma-website-build',
      ...(process.env.GITHUB_TOKEN ? { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function fetchRaw(filePath) {
  const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${filePath}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'soma-website-build' },
  });
  if (!res.ok) throw new Error(`${res.status}: ${url}`);
  return res.text();
}

async function fetchTree(dirPath) {
  try {
    const contents = await fetchJson(`${API_BASE}/contents/${dirPath}?ref=${BRANCH}`);
    return Array.isArray(contents) ? contents : [];
  } catch {
    return [];
  }
}

async function fetchDir(dirName) {
  const localDir = path.join(COMMUNITY_DIR, dirName);
  const entries = await fetchTree(dirName);

  if (entries.length === 0) {
    // Empty dir on remote — ensure local dir exists but is empty
    fs.mkdirSync(localDir, { recursive: true });
    // Clear any stale files
    if (fs.existsSync(localDir)) {
      for (const f of fs.readdirSync(localDir)) {
        const fp = path.join(localDir, f);
        fs.rmSync(fp, { recursive: true, force: true });
      }
    }
    return 0;
  }

  // Collect all files (handle both flat .md files and subdirs like templates/architect/)
  const files = [];

  for (const entry of entries) {
    if (entry.type === 'file' && entry.name.endsWith('.md')) {
      files.push({ path: entry.path, localPath: path.join(localDir, entry.name) });
    } else if (entry.type === 'dir') {
      // Download all files inside subdirs (templates have .md, .json files)
      const subEntries = await fetchTree(entry.path);
      for (const sub of subEntries) {
        if (sub.type === 'file') {
          const subLocalDir = path.join(localDir, entry.name);
          files.push({ path: sub.path, localPath: path.join(subLocalDir, sub.name) });
        }
      }
    }
  }

  // Clear stale local content
  if (fs.existsSync(localDir)) {
    for (const f of fs.readdirSync(localDir)) {
      const fp = path.join(localDir, f);
      fs.rmSync(fp, { recursive: true, force: true });
    }
  }
  fs.mkdirSync(localDir, { recursive: true });

  // Download all files
  let count = 0;
  for (const file of files) {
    const content = await fetchRaw(file.path);
    fs.mkdirSync(path.dirname(file.localPath), { recursive: true });
    fs.writeFileSync(file.localPath, content);
    count++;
  }

  return count;
}

async function main() {
  console.log(`⟐ Fetching community content from ${REPO}...`);

  let totalFiles = 0;
  for (const dir of DIRS) {
    try {
      const count = await fetchDir(dir);
      if (count > 0) console.log(`  ✓ ${dir}: ${count} files`);
      else console.log(`  · ${dir}: empty`);
      totalFiles += count;
    } catch (err) {
      console.warn(`  ⚠ ${dir}: ${err.message}`);
    }
  }

  console.log(`⟐ Done — ${totalFiles} files synced to community/\n`);
}

main().catch((err) => {
  console.error(`⚠ Community fetch failed: ${err.message}`);
  console.error('  Falling back to existing local copy.');
  process.exit(0); // Don't fail the build
});

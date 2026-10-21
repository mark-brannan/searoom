#!/usr/bin/env node
// preview-sites: list the holding branches the Pages site carries as previews,
// one per branch, each served under <base>preview/<slug>/ beside main's site.
//
//   node scripts/preview-sites.mjs <owner/repo>     (GH_TOKEN from the env)
//
// Prints a JSON array for the deploy workflow's build matrix:
//   [{"branch":"hold/night-mode","slug":"night-mode","sha":"…"}]
//
// A holding branch is one under PREFIX. It stops being previewed once its tip
// is the head of a merged pull request, so the merge itself takes the preview
// down even before (or without) the branch being deleted; new commits on the
// same branch bring it back.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Keep in step with deploy.yml: the workflow_run filter, the concurrency
// group and plan's if.
export const PREFIX = 'hold/';

/** The path segment a branch is served under: hold/Night_Mode → night-mode. */
export function previewSlug(branch, prefix = PREFIX) {
  return branch
    .slice(prefix.length)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * branches: [{ name, sha }] for every branch in the repo.
 * mergedHeads: Set of SHAs that are the head of a merged pull request.
 * Returns the previews, sorted by branch name; of two branches that share a
 * slug the first keeps it and the other is skipped (reported in `skipped`).
 */
export function selectPreviews(branches, mergedHeads, prefix = PREFIX) {
  const previews = [];
  const skipped = [];
  const taken = new Map();
  const held = branches
    .filter((b) => b.name.startsWith(prefix))
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const { name, sha } of held) {
    const slug = previewSlug(name, prefix);
    if (!slug) {
      skipped.push({ branch: name, reason: 'empty slug' });
    } else if (mergedHeads.has(sha)) {
      skipped.push({ branch: name, reason: 'merged' });
    } else if (taken.has(slug)) {
      skipped.push({
        branch: name,
        reason: `slug ${slug} taken by ${taken.get(slug)}`,
      });
    } else {
      taken.set(slug, name);
      previews.push({ branch: name, slug, sha });
    }
  }
  return { previews, skipped };
}

/** Run gh with a --jq filter that prints one JSON value per line. */
function ghLines(args) {
  return execFileSync('gh', args, { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function main() {
  const repo = process.argv[2] ?? process.env.GITHUB_REPOSITORY;
  if (!repo) {
    console.error('usage: preview-sites.mjs <owner/repo>');
    process.exit(2);
  }
  const owner = repo.split('/')[0];
  const branches = ghLines([
    'api',
    '--paginate',
    `repos/${repo}/branches?per_page=100`,
    '--jq',
    `.[] | select(.name | startswith("${PREFIX}")) | {name, sha: .commit.sha}`,
  ]);
  const mergedHeads = new Set();
  for (const { name } of branches) {
    const heads = ghLines([
      'api',
      '--paginate',
      `repos/${repo}/pulls?state=closed&head=${owner}:${encodeURIComponent(name)}&per_page=100`,
      '--jq',
      '.[] | select(.merged_at != null) | .head.sha',
    ]);
    for (const sha of heads) mergedHeads.add(sha);
  }
  const { previews, skipped } = selectPreviews(branches, mergedHeads);
  for (const s of skipped) console.error(`skip ${s.branch}: ${s.reason}`);
  console.log(JSON.stringify(previews));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();

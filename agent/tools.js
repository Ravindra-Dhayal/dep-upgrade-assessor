// agent/tools.js
// Tool: fetch changelog/release notes for every version between
// currentVersion and targetVersion (inclusive), not just the target.
// This matters because breaking changes are often introduced at a
// major version bump partway through the range, not at the final tag.

async function getAllVersionsInRange(packageName, currentVersion, targetVersion) {
  const npmRes = await fetch(`https://registry.npmjs.org/${packageName}`);
  if (!npmRes.ok) {
    throw new Error(`npm registry lookup failed for ${packageName}: ${npmRes.status}`);
  }
  const npmData = await npmRes.json();
  const allVersions = Object.keys(npmData.versions || {});

  // Simple semver-ish filter: versions strictly after current, up to and including target.
  const inRange = allVersions.filter((v) => {
    return compareVersions(v, currentVersion) > 0 && compareVersions(v, targetVersion) <= 0;
  });

  return { repoUrl: npmData.repository && npmData.repository.url, versions: inRange.sort(compareVersions) };
}

function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

async function getReleaseNotesForTag(owner, repo, version) {
  const tagsToTry = [`v${version}`, version];
  for (const tag of tagsToTry) {
    const relRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`
    );
    if (relRes.ok) {
      const rel = await relRes.json();
      return { found: true, tag, body: rel.body, url: rel.html_url };
    }
  }
  return { found: false, version };
}

async function getChangelog(packageName, currentVersion, targetVersion) {
  const { repoUrl, versions } = await getAllVersionsInRange(packageName, currentVersion, targetVersion);
  if (!repoUrl) return { found: false, reason: "No repository URL in npm metadata" };

  const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (!match) return { found: false, reason: `Could not parse GitHub owner/repo from: ${repoUrl}` };
  const [, owner, repo] = match;

  const releases = [];
  for (const version of versions) {
    const notes = await getReleaseNotesForTag(owner, repo, version);
    releases.push({ version, ...notes });
  }

  return { found: true, owner, repo, releases };
}

const fs = require("fs");
const path = require("path");

// Tool: search a codebase directory for usages of a given package.
// Returns every file (and matching lines) that imports/requires it.
function searchCodebaseUsage(fixtureDir, packageName) {
  const matches = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && /\.(js|ts|mjs|cjs)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf8");
        const lines = content.split("\n");
        lines.forEach((line, i) => {
          const usesRequire = line.includes(`require("${packageName}")`) || line.includes(`require('${packageName}')`);
          const usesImport = line.includes(`from "${packageName}"`) || line.includes(`from '${packageName}'`);
          if (usesRequire || usesImport) {
            matches.push({ file: path.relative(fixtureDir, fullPath), line: i + 1, code: line.trim() });
          }
        });
      }
    }
  }

  walk(fixtureDir);
  return { package: packageName, usages: matches };
}

module.exports = { getChangelog, searchCodebaseUsage };
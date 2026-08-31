// agent/assess.js
// The core agent: combines changelog + codebase usage, asks Claude
// to produce a risk verdict with reasoning.

require("dotenv").config();
const path = require("path");
const { GoogleGenAI } = require("@google/genai");
const { getChangelog, searchCodebaseUsage } = require("./tools");

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function assessUpgrade(fixtureDir) {
  const abs = path.resolve(fixtureDir);
  const target = require(path.join(abs, "upgrade-target.json"));

  const changelog = await getChangelog(target.package, target.currentVersion, target.targetVersion);
  const usage = searchCodebaseUsage(abs, target.package);

  const prompt = `You are assessing whether upgrading a dependency is safe.

Package: ${target.package}
Current version: ${target.currentVersion}
Target version: ${target.targetVersion}

Changelog across all versions in this range (JSON):
${JSON.stringify(changelog.releases?.map(r => ({ version: r.version, notes: r.body })) || [], null, 2)}

Where this package is actually used in the codebase (JSON):
${JSON.stringify(usage.usages, null, 2)}

Based ONLY on the above, respond with a JSON object with these fields:
- "verdict": "safe" or "risky"
- "confidence": "low", "medium", or "high"
- "reasoning": a short explanation, citing the specific changelog entry and specific file/line if relevant
- "affectedFiles": array of file paths that would actually be affected, or empty array

Respond with ONLY the JSON object, nothing else.`;

    const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = response.text;
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

const fixtureDir = process.argv[2];
if (!fixtureDir) {
  console.error("Usage: node agent/assess.js <fixtureDir>");
  process.exit(1);
}
assessUpgrade(fixtureDir).then((result) => {
  console.log(JSON.stringify(result, null, 2));
});
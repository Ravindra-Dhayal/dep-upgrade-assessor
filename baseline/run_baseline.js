const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

function runBaseline(fixtureDir) {
  const abs = path.resolve(fixtureDir);
  const target = JSON.parse(
    fs.readFileSync(path.join(abs, "upgrade-target.json"), "utf8")
  );

  const result = {
    fixture: path.basename(abs),
    package: target.package,
    targetVersion: target.targetVersion,
    verdict: null,
    testsPassed: null,
    rawTestOutput: "",
  };

  try {
    execSync(`npm install ${target.package}@${target.targetVersion} --silent`, {
      cwd: abs,
      stdio: "pipe",
    });
  } catch (err) {
    result.verdict = "risky";
    result.testsPassed = false;
    result.rawTestOutput = `npm install failed: ${err.message}`;
    return result;
  }

  try {
    const out = execSync("npm test", { cwd: abs, stdio: "pipe" });
    result.testsPassed = true;
    result.rawTestOutput = out.toString();
    result.verdict = "safe";
  } catch (err) {
    result.testsPassed = false;
    result.rawTestOutput = (err.stdout || err.message || "").toString();
    result.verdict = "risky";
  }

  return result;
}

const fixtureDir = process.argv[2];
if (!fixtureDir) {
  console.error("Usage: node baseline/run-baseline.js <fixtureDir>");
  process.exit(1);
}
console.log(JSON.stringify(runBaseline(fixtureDir), null, 2));
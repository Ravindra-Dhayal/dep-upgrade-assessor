const chalk = require("chalk");
const { buildSummary } = require("../lib/format");

function printReport(counts) {
  const summary = buildSummary(counts);
  const color = counts.fail === 0 ? "green" : "red";
  console.log(chalk[color](summary));
}

if (require.main === module) {
  printReport({ pass: 42, fail: 0 });
}

module.exports = { printReport };
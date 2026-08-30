function formatNumber(n) {
  if (typeof n !== "number" || Number.isNaN(n)) {
    throw new TypeError("formatNumber expects a number");
  }
  return n.toLocaleString("en-US");
}

function buildSummary(counts) {
  const { pass = 0, fail = 0 } = counts;
  const total = pass + fail;
  return `${formatNumber(pass)}/${formatNumber(total)} checks passed`;
}

module.exports = { formatNumber, buildSummary };
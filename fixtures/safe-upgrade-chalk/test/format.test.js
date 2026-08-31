const test = require("node:test");
const assert = require("node:assert/strict");
const { formatNumber, buildSummary } = require("../lib/format");

test("formats with thousands separators", () => {
  assert.equal(formatNumber(1000), "1,000");
});

test("builds pass/total summary", () => {
  assert.equal(buildSummary({ pass: 8, fail: 2 }), "8/10 checks passed");
});
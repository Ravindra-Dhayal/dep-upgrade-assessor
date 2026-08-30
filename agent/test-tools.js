const { getChangelog } = require("./tools");

getChangelog("chalk", "4.1.2", "5.3.0").then((result) => {
  console.log(JSON.stringify(result, null, 2));
});

const { searchCodebaseUsage } = require("./tools");
console.log(JSON.stringify(searchCodebaseUsage("fixtures/silent-break-chalk", "chalk"), null, 2));
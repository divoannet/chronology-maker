const config = require("./configs").configBuilder;
const outputPath = `./data/${config.forumName}.json`;
const data = require(outputPath);

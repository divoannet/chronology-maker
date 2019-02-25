const config = require("./configs").configBuilder;
const dataPath = `./data/${config.forumName}.json`;
const data = require(dataPath);
const fs = require('fs');

const ouput = `var chronologyData = ${JSON.stringify(data, null, 4)}`;

const outputPath = `./data/66244.js`

if (!fs.existsSync(outputPath)) {
    fs.writeFile(outputPath, ouput, 'utf8', err => {
      if (err) console.log(err);
    });
    console.log("\x1b[32m", `--- File created---`);
  } else {
    fs.writeFileSync(outputPath, ouput, 'utf8', err => {
      if (err) console.log(err);
    });
    console.log("\x1b[32m", `--- File updated---`);
  }
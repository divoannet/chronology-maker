require('dotenv').config();
const needle = require("needle");
const cheerio = require("cheerio");

const config = require("./configs").configBuilder;
const outputPath = `./data/${config.forumName}.json`;
const data = require(outputPath);

(function() {
    if (!data || data.length === 0) {
        console.log("\x1b[31m", `Run`)
        console.log(`  node scrap.js`)
        console.log("\x1b[31m", `first`)
        return;
    }

    getMembers(data).then(result => {
        require('fs').writeFileSync(outputPath, JSON.stringify(result, null, 4));
        console.log("\x1b[32m", `--- File ${config.forumName}.json updated---`);
    });
})();

async function getMembers(data) {
    const newData = [];

    for (let i = 0; i < data.length; i++) {
        if (!data[i].url || data[i].url === '') {
            newData.push(data[i]);
            continue;
        }
        if (data[i].members && data[i].members.length > 1) {
            // todo: think about same characters with different names
            newData.push(data[i]);
            continue;
        }
        const topicData = await needle('get', data[i].url);
        const $ = cheerio.load(topicData.body);
        const members = [];
        $('.pa-author').each((i, el) => {
            const author = $(el).text().substring(7);
            if (!result.includes(author) && !config.EXCLUDED_USERS.includes(author)) {
                result.push(author);
            }
        });
        newData.push({
            ...data[i],
            members
        });
    }

    return newData;
}
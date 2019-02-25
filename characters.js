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

    getCharacters(data).then(result => {
        require('fs').writeFileSync(outputPath, JSON.stringify(result, null, 4));
        console.log("\x1b[32m", `--- File ${config.forumName}.json updated---`);
    });
})();

async function getCharacters(data) {
    const newData = [];

    for (let i = 0; i < data.length; i++) {
        if (!data[i].url || data[i].url === '') {
            newData.push(data[i]);
            continue;
        }
        if (data[i].characters && Array.isArray(data[i].characters)) {
            newData.push(data[i]);
            continue;
        }
        const charCount = data[i].characters ? data[i].characters.length : 0;
        const topicData = await needle('get', data[i].url);
        const $ = cheerio.load(topicData.body);
        const characters = [];
        $('.pa-author').each((i, el) => {
            const author = $(el).text().substring(7);
            const character = config.replace && Object.keys(config.replace).includes(author)
                ? config.replace[author]
                : author;
            if (!characters.includes(character) && !process.env.EXCLUDED_USERS.includes(character)) {
                characters.push(character);
            }
        });
        if (charCount + characters.length < 2) {
            console.log("\x1b[33m", `--Topic ${data[i].url} has ${characters.length} characters`);
        }
        newData.push({
            ...data[i],
            characters
        });
    }

    return newData;
}
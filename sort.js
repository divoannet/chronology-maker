require('dotenv').config();
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

    sortData(data).then(result => {
        require('fs').writeFileSync(outputPath, JSON.stringify(result, null, 4));
        console.log("\x1b[32m", `--- File ${config.forumName}.json updated---`);
    });
})();

async function sortData(data) {
    return data
        .filter(topic => {
            return topic.date && topic.date !== '';
        })
        .sort((topicA, topicB) => {
            // a > b return 1
            if (topicA === topicB) {
                console.log("\x1b[32m", `Same date ${topicA}`);
            }

            let dateA = topicA.date.split('.');
            let dateB = topicB.date.split('.');

            const difference = dateA.length - dateB.length;
            if (difference > 0) {
                const diffArr = difference === 1 ? [0] : new Array(difference).join('0').split('');
                dateB = diffArr.concat(dateB);
            } else if (difference < 0) {
                const diffArr = difference === -1 ? [0] : new Array(-difference).join('0').split('');
                dateA = diffArr.concat(dateA);
            }

            for (let i = dateA.length; i >= 0; i--) {
                if (+dateA[i] > +dateB[i]) {
                    return -1;
                }
                if (+dateA[i] < +dateB[i]) {
                    return 1;
                }
            }
        });
}
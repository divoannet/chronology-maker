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
    formatOutput(data).then(result => {
        require('fs').writeFileSync(outputPath, JSON.stringify(result, null, 4));
        console.log("\x1b[32m", `--- File ${config.forumName}.json updated---`);
    });
})();

async function formatOutput(data) {
    const newData = [];
    data.forEach(async theme => {
        if (theme.date) {
            newData.push(theme);
            return;
        }
        const {url, title} = theme;
        const date = title.match(/(\d{1,2}\.)?\d{1,2}\.\d{1,4}/);
        newData.push({
            ...theme,
            date: formatDate(date && date[0]),
            title: date ? getTitle(title) : title
        });
    });

    return newData;
}

function getTitle(str) {
    const arr = str.split(/\[|\]/gi);
    if (arr.length === 1) {
        return str.trim();
    }
    if (arr.length === 5) {
        return str.substring(4).trim();
    }
    return arr[2].trim();
}

function formatDate(date) {
    if (!process.env.FORMAT_DATE) {
        return date;
    }
    if (!date) {
        return '';
    }
    const arr = date.split('.');
    if (arr.length === 3) {
        const day = arr[0].padStart(2,'0');
        const month = arr[1].padStart(2,'0');
        const year = arr[2].length === 2
            ? arr[2].padStart(4, process.env.DATE_PREFIX)
            : arr[2];
        return `${day}.${month}.${year}`;
    }
    return date;
};
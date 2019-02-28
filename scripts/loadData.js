const fs = require('fs');
const path = require('path');

const config = require("../configs").configBuilder;
const outputPath = path.resolve(__dirname, `../data/${config.forumName}.json`);

module.exports = async function loadData() {
    if (fs.existsSync(outputPath)) {
        const data = fs.readFileSync(outputPath, 'utf8', async function(err, data) {
            if (err) {
                throw new Error('Загрузка файла не удалась');
            }
            return await new Buffer(data);
        });
        return JSON.parse(data);
    } else {
        const dirPath = path.resolve(__dirname, '../data');
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, 0744);
        }
        fs.writeFile(outputPath, '[]', async function (err) {
            if (err) {
                throw new Error(err);
            };
            return [];
        });
        console.log(`  Файл ${config.forumName}.json создан`.gray);
        return [];
    }
}
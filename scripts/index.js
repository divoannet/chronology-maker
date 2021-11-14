require('dotenv').config();
const fs = require('fs');
const path = require('path');
var colors = require('colors');

const config = require("../configs").configBuilder;
const outputPath = `../data/${config.forumName}.json`;

const loadData = require('./loadData.js');
const scrapDomain = require('./scrapDomain.js');

const formatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
})

async function chronologyMaker() {
    console.log(`Начало работы: ${formatter.format(new Date())}`);

    try {
        // загрузка уже сохранённых данных
        const data = await loadData();

        // обновление данных
        const result = await scrapDomain(data);

        fs.writeFileSync(path.resolve(__dirname, outputPath), JSON.stringify(result, null, 4)), err => {
            if (err) console.log(err);
        };
        
    }
    catch (err) {
        console.log('Ошибка');
        console.log(err);
    }
};

chronologyMaker().then(() => {      
    console.log(`Окончание работы: ${formatter.format(new Date())}\n`);
});
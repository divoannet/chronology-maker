require('dotenv').config();
const fs = require('fs');
const path = require('path');
var colors = require('colors');

const config = require("../configs").configBuilder;

const loadData = require('./loadData.js');
const scrapDomain = require('./scrapDomain.js');

async function chronologyMaker() {
    console.log('Начинаю работу');
    console.log('----------------');

    try {
        // загрузка уже сохранённых данных
        const data = await loadData();

        // обновление данных
        await scrapDomain(data);
    }
    catch (err) {
        console.log('--------------------'.red);
        console.log(`>>> ${err.message} <<<`.red);
        console.log('--------------------'.red);
    }
};

chronologyMaker().then(() => {
    console.log(' ');
    console.log('----------------');
    console.log('Готово');
    console.log(' ');
});
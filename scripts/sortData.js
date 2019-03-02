require('dotenv').config();
const fs = require('fs');
const path = require('path');
var colors = require('colors');

const config = require("../configs").configBuilder;
const outputPath = `../data/${config.forumName}.json`;

const loadData = require('./loadData.js');
const {sortData} = require('./helpers.js');

async function sort() {
    console.log('Начинаю работу');
    console.log('----------------');

    try {
        // загрузка уже сохранённых данных
        const data = await loadData();

        // обновление данных
        const result = await sortData(data);

        fs.writeFileSync(path.resolve(__dirname, outputPath), JSON.stringify(result, null, 4)), err => {
            if (err) console.log(err);
        };
    
    }
    catch (err) {
        console.log('--------------------'.red);
        console.log(`>>> ${err.message} <<<`.red);
        console.log('--------------------'.red);
    }
};

sort().then(() => {      
    console.log(' ');
    console.log('----------------');
    console.log('Готово');
    console.log(' ');
});
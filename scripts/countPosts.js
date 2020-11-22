const needle = require("needle");
const cheerio = require("cheerio");
const moment = require("moment");

const config = require("../configs").configBuilder;

async function countPosts() {
    console.log('Считаю посты');
    console.log('----------------');

    let result = 0;

    const forums = config.forums;

    const startDate = moment(process.argv[2], 'DD.MM.YY');
    const endDate = moment(process.argv[3], 'DD.MM.YY').endOf('day');

    if (! startDate.isValid() || ! endDate.isValid() || endDate.isBefore(startDate)) {
        console.log('Некорректная дата');
        return;
    }

    const today = moment().startOf('day');

    const topics = [];

    // get topics
    for (let i = 0; i < forums.length; i++) {
        const { url } = forums[i];

        const forumData = await needle("get", url);
        const $ = cheerio.load(forumData.body);

        const pageTrs = $(".forum tr");

        for (let i = 1; i < pageTrs.length; i++) {
            const dateString = $(pageTrs[i]).find('.tcr').text().split(' ')[0];
            const date = getDate(dateString);

            if (date.isBefore(startDate)) {
                continue;
            }

            const href = $(pageTrs[i]).find('.tclcon > a').attr('href') + '&p=-1';
            topics.push(href);
        }
    }

    const topicsLinks = [];
    for (let i = 0; i < topics.length; i++) {
        const topicData = await needle("get", topics[i]);
        const $$ = cheerio.load(topicData.body);

        const dateStrings = $$('.permalink');
        let topicLink;

        dateStrings.each((key, date) => {
            if (key === 0) return;

            const dateString = $$(date).text().split(' ')[0];
            const topicDate = getDate(dateString);
            if (topicDate.isBetween(startDate, endDate)) {
                if (! topicLink) {
                    topicsLinks.push($$(date).attr('href'))
                }
                topicLink = topicLink || $$(date).attr('href');
                result += 1;
            }
        })
    }
    console.log(' ');
    console.log(topicsLinks.join('\n'));
    return result;
}

function getDate(dateString) {
    switch (dateString) {
        case 'Сегодня':
            return moment().startOf('day');
        case 'Вчера':
            return moment().subtract(1, 'day').startOf('day');
        default:
            return moment(dateString, 'DD.MM.YYYY');
    }
}

countPosts().then(count => {      
    console.log(' ');
    console.log('----------------');
    console.log(isNumber(count) ? 'Всех постов за период: ' + count : 'Выход с ошибкой');
    console.log(' ');
});

function isNumber(value) {
   return typeof value === 'number' && isFinite(value);
}
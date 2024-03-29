const needle = require("needle");
const cheerio = require("cheerio");
const moment = require("moment");

const config = require("../configs").configBuilder;

async function countPosts() {
    console.log('Считаю посты');
    console.log('----------------');

    let result = 0;

    const forums = config.forums;

    const startDate = moment(process.argv[2], 'DD.MM.YY').startOf('day');
    const endDate = moment(process.argv[3], 'DD.MM.YY').endOf('day');
    const notSkipDoubles = process.argv.includes('--noskip');
    const countStats = process.argv.includes('--stats');

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
    const authors = {};
    for (let i = 0; i < topics.length; i++) {
        const topicData = await needle("get", topics[i]);
        const $$ = cheerio.load(topicData.body);

        const dateStrings = $$('.permalink');
        let topicLink;

        dateStrings.each((key, date) => {
            if (key === 0) return;

            const dateString = $$(date).text();
            const topicDate = getDate(dateString);
            if (topicDate.isBetween(startDate, endDate)) {
                const parentPost = $$(date).closest('.post');
                const author = $$(parentPost).find('.pa-author a').text();
                if (authors[author]) {
                    authors[author] += 1;
                } else {
                    authors[author] = 1;
                }
                if (! topicLink || notSkipDoubles) {
                    const [href, tail] = $$(date).attr('href').split('?')
                    const pid = tail.split('#')[1].substring(1)

                    topicsLinks.push(`${href}?pid=${pid}#p${pid}`)
                }
                topicLink = topicLink || $$(date).attr('href');
                result += 1;
            }
        })
    }
    console.log(' ');
    console.log(topicsLinks.join('\n'));
    console.log(' ');
    if (countStats) {
        console.log(`Написали постов с ${moment(startDate).format('DD.MM.YY')} по ${moment(endDate).format('DD.MM.YY')}:`);
        Object.entries(authors).forEach(([author, count]) => {
            console.log(`${author}: ${count}`)
        });
    }
    return result;
}

function getDate(dateString) {
    const string = dateString
        .replace('Сегодня', moment().format('DD.MM.YY'))
        .replace('Вчера', moment().subtract(1, 'day').format('DD.MM.YY'));

    return moment(string, 'DD.MM.YYYY HH:mm');
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
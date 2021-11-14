const needle = require("needle");
const cheerio = require("cheerio");

const config = require("../configs").configBuilder;

const { getForumTopic, getDefaultValueByType, sortData } = require('./helpers');

module.exports = async function scrapDomain(oldData) {
    console.log(' ');
    console.log('1. Scrap');

    const data = [...oldData];

    let topicList = [];
    const forums = config.forums;
    for (let i = 0; i < forums.length; i++) {
        const {url} = forums[i];

        const forumData = await needle("get", `${url}&p=-1`);
        const $ = cheerio.load(forumData.body);

        topicList = topicList.concat(getForumTopic($, forums[i]));
        console.log(`   forum ${i} | ${url}`.grey);
    }

    console.log(`   `);
    console.log(`2. Update topics`);

    const removeTopics = [];

    topicList.forEach((newTopic, index) => {
        if (Array.isArray(config.ignore) && config.ignore.includes(newTopic.url)) {
            return;
        }

        const oldTopic = data.find(oldTopic => newTopic.url === oldTopic.url);

        if (!oldTopic) {
            if (!newTopic.remove) {
                const addTopic = {
                    status: newTopic.status,
                    title: newTopic.title,
                    url: newTopic.url,
                    date: newTopic.date,
                    order: 0,
                    characters: [],
                };
                if (config.additionalFields) {
                    config.additionalFields
                      .forEach(({name, type}) => {
                          addTopic[name] = getDefaultValueByType(type);
                      })
                }
                data.push(addTopic);
                console.log(`   [add]: ${newTopic.url}  |  «${newTopic.title}»`);
            }
            return;
        }

        if (newTopic.remove) {
            removeTopics.push(newTopic.url);
            console.log(`   [remove]: ${newTopic.url}  |  «${newTopic.title}» `.yellow);
            return;
        }

        if (oldTopic.status !== newTopic.status) {
            console.log(`   [update]: ${newTopic.url}  |  «${newTopic.title}» | ${oldTopic.status} => ${newTopic.status}`.green);
            oldTopic.status = newTopic.status;
            return;
        }
    });

    const cleanedData = data.filter(topic => !removeTopics.includes(topic.url));

    if (! process.argv.includes('nousers')) {
        console.log(`   `);
        console.log(`3. Update characters`);
    
        let percentes = 0;

        for (let i = 0; i < cleanedData.length; i++) {
            const progress = Math.round((100 * i) / cleanedData.length);
            if (progress >= percentes + 10 && progress !== percentes) {
                console.log(`      ${progress}%`.grey);
                percentes = progress;
            }
    
            const topic = cleanedData[i];
            if (!topic.url || topic.url === '') {
                continue;
            }
    
            if (topic.characters && !config.updateStatus.includes(topic.status)) {
                if (topic.characters.length === 1) {
                    console.log(`   ${topic.url}  |  in «${topic.title}» only ${topic.characters} character/s`);
                }
                if (topic.characters.length === 0) {
                    console.log(`   ${topic.url}  |  in «${topic.title}» there are no characters`);
                }
                    continue;
            }
    
            if (!topic.characters) {
                topic.characters = [];
            }
    
            const topicData = await needle('get', topic.url);
            const $ = cheerio.load(topicData.body);
    
            $('.pa-author').each((i, el) => {
                if (i === 0) return;
    
                const author = $(el).text().substring(7);
                const character = config.replace && Object.keys(config.replace).includes(author)
                    ? config.replace[author]
                    : author;
    
                if (!topic.characters.includes(character) && !config.ignoreUsers.includes(character)) {
                    console.log(`   [add]: ${topic.url}  |  ${character} to topic «${topic.title}»`);
                    topic.characters.push(character);
                }
            });
        }
    }

    if (!config.formatDate) {
        return cleanedData;
    }

    return sortData(cleanedData);
}

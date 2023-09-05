const needle = require("needle");
const cheerio = require("cheerio");

const config = require("../configs").configBuilder;

const { getForumTopic, getDefaultValueByType, sortData } = require('./helpers');
const { loginToBoard } = require('./login');

const requestForum = (url, params, options) => new Promise((resolve, reject) => {
    needle.request("get", `${url}&p=-1`, params, options, (err, resp) => {
        if (err) {
            reject(err);
        }
        resolve(resp.body);
    });
})

const getTopicList = async () => {
    let topicList = [];
    const forums = config.forums;

    const loginHash = await loginToBoard();
    const login = config.login;
    const password = config.password;

    const params = loginHash ? { login, password } : {};
    const options = loginHash ? {
        json: true,
        headers: {
            cookie: `mybb_ru=${loginHash}`,
        }
    } : {};

    for (let i = 0; i < forums.length; i++) {
        const {url} = forums[i];
        let forumData = null;

        const body = await requestForum(url, params, options);
        const $ = cheerio.load(body);
        topicList = topicList.concat(getForumTopic($, forums[i]));
    }

    return topicList;
}

module.exports = async function scrapDomain(oldData) {
    let data = [...oldData];

    let topicList = await getTopicList();
    const forums = config.forums;

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
            console.log(`   [remove]: ${newTopic.url}  |  «${newTopic.title}» `);
            return;
        }

        if (oldTopic.status !== newTopic.status) {
            console.log(`   [update]: ${newTopic.url}  |  «${newTopic.title}» | ${oldTopic.status} => ${newTopic.status}`);
            oldTopic.status = newTopic.status;
            return;
        }
    });

    const cleanedData = data.filter(topic => !removeTopics.includes(topic.url));

    if (!process.argv.includes('nousers')) {
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
                    console.log(`   [add character]: ${topic.url}  |  ${character} to topic «${topic.title}»`);
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

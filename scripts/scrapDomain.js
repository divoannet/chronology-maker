const fs = require('fs');
const path = require('path');
const needle = require("needle");
const cheerio = require("cheerio");

const config = require("../configs").configBuilder;

const { getForumTopic, getForumTopicsByPages, sortData } = require('./helpers');

module.exports = async function scrapDomain(oldData) {
    console.log(' ');
    console.log('1. Scrap');

    const data = [...oldData];

    let topicList = [];
    const forums = config.forums;
    for (let i = 0; i < forums.length; i++) {
        const {url} = forums[i];

        const forumData = await needle("get", url);
        const $ = cheerio.load(forumData.body);

        const pageLinks = $(".linkst .pagelink a:not([class])");
        const pagesCount = +$(pageLinks[pageLinks.length - 1]).text() || 1;

        topicList = topicList.concat(getForumTopic($, forums[i]));
        console.log(`   forum ${i} | ${url}`.grey);
        if (1 === pagesCount) {
            console.log(`   `);
        }
    
        if (pagesCount > 1) {
            const forumTopics = await getForumTopicsByPages(forums[i], pagesCount, i);
            topicList = topicList.concat(forumTopics);
        }
    }

    console.log(`   `);
    console.log(`2. Update topics`);

    topicList.forEach((newTopic, index) => {
        if (Array.isArray(config.ignore) && config.ignore.includes(newTopic.url)) {
            return;
        }

        const oldTopic = data.find(oldTopic => newTopic.url === oldTopic.url);

        if (!oldTopic) {
            if (!newTopic.remove) {
                data.push(newTopic);
                console.log(`   [add]: ${newTopic.url}  |  ${newTopic.title}`);
            }
            return;
        }

        if (newTopic.remove) {
            data.splice(index, 1);
            console.log(`   [remove]: ${newTopic.url}  |  ${newTopic.title} `.yellow);
            return;
        }

        if (oldTopic.status !== newTopic.status) {
            console.log(`   [update]: ${newTopic.url}  |  ${newTopic.title} | ${oldTopic.status} => ${newTopic.status}`.green);
            oldTopic.status = newTopic.status;
            return;
        }
    });

    console.log(`   `);
    console.log(`3. Update characters`);

    let percentes = 0;

    for (let i = 0; i < data.length; i++) {
        const progress = Math.round((100 * i) / data.length);
        if (progress >= percentes + 10 && progress !== percentes) {
            console.log(`      ${progress}%`.grey);
            percentes = progress;
        }

        const topic = data[i];
        if (!topic.url || topic.url === '') {
            continue;
        }

        if (topic.characters && !config.updateStatus.includes(topic.status)) {
            if (topic.characters.length < 2) {
                console.log(`   ${topic.url}  |  in ${topic.title} only ${topic.characters} character/s`);
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
                console.log(`   [add]: ${topic.url}  |  ${character} to topic ${topic.title}`);
                topic.characters.push(character);
            }
        });
        if (topic.characters.length < 2) {
            console.log(`   ${topic.url}  |  in ${topic.title} only ${topic.characters} character/s`);
        }
    }

    return sortData(data);
}

const fs = require('fs');
const path = require('path');
const needle = require("needle");
const cheerio = require("cheerio");

const config = require("../configs").configBuilder;

const { getForumTopic } = require('./helpers');

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

        if (pagesCount > 1) {
            const forumTopics = await getForumTopicsByPages(forums[i], pagesCount);
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
                console.log(`   [add]: ${newTopic.title} | ${newTopic.url}`);
            }
            return;
        }

        if (newTopic.remove) {
            data.splice(index, 1);
            console.log(`   [remove]: ${newTopic.title} | ${newTopic.url}`.yellow);
            return;
        }

        if (oldTopic.status !== newTopic.status) {
            console.log(`   [update]: ${newTopic.title} | ${newTopic.url} | ${oldTopic.status} => ${newTopic.status}`.green);
            oldTopic.status = newTopic.status;
            return;
        }
    });

    console.log(`   `);
    console.log(`3. Update characters`);

    for (let i = 0; i < data.length, i++) {
        const topic = data[i];
        if (!topic.url || topic.url === '') {
            return;
        }


    }

}

async function getForumTopicsByPages(forum, pagesCount) {
    let data = [];
    for (let i = 2; i <= pagesCount; i++) {
        const forumData = await needle("get", `${forum.url}&p=${i}`);
        const $ = cheerio.load(forumData.body);
        data = data.concat(getForumTopic($, forum));
    }
    return data;
}

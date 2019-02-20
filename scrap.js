require('dotenv').config();
const fs = require('fs');
const cheerio = require("cheerio");
const needle = require("needle");

const config = require("./configs").configBuilder;
const outputPath = `./data/${config.forumName}.json`;

(function() {
  if (!config.forumName) {
    console.log("\x1b[41m", `No config file!`);
    return;
  }
  scrapDomen(config.forums).then(result => {
    const syncResult = getMergedData(result);

    if (!fs.existsSync(outputPath)) {
      fs.writeFile(outputPath, JSON.stringify(syncResult, null, 4), err => {
        if (err) console.log(err);
      });
      console.log("\x1b[32m", `--- File ${config.forumName}.json created---`);
    } else {
      fs.writeFileSync(outputPath, JSON.stringify(syncResult, null, 4)), err => {
        if (err) console.log(err);
      };
      console.log("\x1b[32m", `--- File ${config.forumName}.json updated---`);
    }
  });
})();

async function scrapDomen(forums) {
  let data = [];
  for (let i = 0; i < forums.length; i++) {
    const forumData = await needle("get", forums[i].url);
    const $ = cheerio.load(forumData.body);

    const pageLinks = $(".linkst .pagelink a:not([class])");
    const pagesCount = +$(pageLinks[pageLinks.length - 1]).text() || 1;

    data = data.concat(getForumTopic($, forums[i]));

    if (pagesCount > 1) {
        const forumTopics = await getForumTopicsByPages(forums[i], pagesCount);
        data = data.concat(forumTopics);
    }
  }
  return data;
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

function getForumTopic($, forum) {
    let data = [];
    let links = [];
    const rows = $('.forum tbody tr');
    rows.each((i, row) => {
      links.push($(row).find('a')[0]);
    });
    links.forEach(link => {
        data.push({
          status: forum.id,
          url: $(link).attr('href'),
          title: $(link).text()
        });
        if (forum.remove) {
          data[data.length - 1].remove = true;
        }
    });
    return data;
}

function getMergedData(newData) {
  if (!fs.existsSync(outputPath)) {
    return newData;
  }

  const data = require(outputPath);

  if (!data || data.length === 0) {
    return newData;
  }

  newData.forEach(newTopic => {

    for (let i = 0; i < data.length; i++) {
      if (data[i].url === newTopic.url) {
        if (newTopic.remove) {
          data.splice(i, 1);
          console.log("\x1b[33m", `--Topic ${newTopic.title} was removed from json`);
          return;
        }
        if (data[i].status !== newTopic.status) {
          console.log("\x1b[33m", `--Topic ${newTopic.title} was updated from ${data[i].status} to status ${newTopic.status}`);
        }
        data[i].status = newTopic.status;
        return;
      }
    }

    if (!newTopic.remove) {
      data.push(newTopic);
      console.log("\x1b[32m", `--Topic ${newTopic.title} was added to json`);
    }
  });

  return data;
}
const config = require("../configs").configBuilder;
const needle = require("needle");
const cheerio = require("cheerio");

// FORMAT DATA

function getForumTopic($, forum) {
    let data = [];
    let links = [];
    const rows = $('.forum tbody tr');
    rows.each((i, row) => {
      links.push($(row).find('a')[0]);
    });
    links.forEach(link => {
      const url = $(link).attr('href');
      if (config.ignore.includes(url)) {
        return;
      }
      const fullTitle = $(link).text();
      const dateMatch = fullTitle.match(/(\d{1,2}\.)?\d{1,2} \d{1,2}:\d{1,2} \D{1,2}/);
      const date = formatDate(dateMatch, fullTitle, url, forum);
      data.push({
        status: forum.id,
        url,
        title: getTitle(fullTitle),
        ...date
      });
      if (forum.remove) {
        data[data.length - 1].remove = true;
      }
    });
    return data;
}

async function getForumTopicsByPages(forum, pagesCount, forumId) {
  let data = [];
  for (let i = 2; i <= pagesCount; i++) {
      const forumData = await needle("get", `${forum.url}&p=${i}`);
      const $ = cheerio.load(forumData.body);
      data = data.concat(getForumTopic($, forum));
      console.log(`      page ${i} / ${pagesCount}`.grey);
      if (i === pagesCount) {
        console.log(`   `);
      }
    }
  return data;
}

function getTitle(title) {
    const separators = (config.dateSeparator || '[]').split('');

    switch (separators.length) {
        case 1:
            const index = title.indexOf(separators[0]);
            return index >= 0 ? title.substring(index + 1).trim() : title;
        case 2:
            const [open, close] = separators;
            const regexp = new RegExp(`\\${open}(.*?)\\${close}`, 'gi');
            return title.replace(regexp, '').trim();
        default:
            return title;
    }
}

function formatDate(dateMatch, fullTitle, url, forum) {
    if (!dateMatch) {
        return {
          date: ''
        };
    }
    const dateString = dateMatch[0];

    if (!config.formatDate) {
        return {
          date: dateString
        };
    }

    const date = dateString.replace(':', '').replace(':', '').replace(/ \D{2}$/, '').replace(' ', '.');

    return {
      date: date,
      visibleDate: dateString
    };
}

// SORT

function sortData(data) {
  return data
      .filter(topic => {
          return topic.date && topic.date !== '';
      })
      .sort((topicA, topicB) => {
        if (topicA.date === topicB.date) {
            const timeA = +topicA.order || 0;
            const timeB = +topicB.order || 0;

            if (timeB > timeA) {
                return 1;
            }
            if (timeB < timeA) {
                return -1;
            }
        }

          let dateA = topicA.date.split('.');
          let dateB = topicB.date.split('.');

          const difference = dateA.length - dateB.length;
          if (difference > 0) {
              const diffArr = difference === 1 ? [0] : new Array(difference).join('0').split('');
              dateB = diffArr.concat(dateB);
          } else if (difference < 0) {
              const diffArr = difference === -1 ? [0] : new Array(-difference).join('0').split('');
              dateA = diffArr.concat(dateA);
          }

          for (let i = dateA.length; i >= 0; i--) {
              if (+dateA[i] > +dateB[i]) {
                  return -1;
              }
              if (+dateA[i] < +dateB[i]) {
                  return 1;
              }
          }
      });
}

function fixContract(data) {
  return data.map(item => ({
    url: item.url,
    title: item.title,
    date: item.date,
    order: item.order,
    visibleDate: item.visibleDate,
    text: item.text,
    fulltext: item.fulltext,
    characters: item.characters,
    categories: item.categories,
    status: item.status,
    story: item.story,
  }))
}

module.exports = {
    getForumTopic,
    getForumTopicsByPages,
    sortData,
    fixContract,
};

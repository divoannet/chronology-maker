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
      const dateMatch = fullTitle.match(/(\d{1,2}\.)?\d{1,2}\.\d{1,4}/);
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
    const date = dateMatch[0];

    if (!config.formatDate) {
        return {
          date: date
        };
    }

    const arr = date.split('.');

    if (arr.length === 1) {
        return {
          date: '',
          visibleDate: date
        };
    }

    const isHumanDate = arr.length === 3;

    const dateCenture = config.dateCenture || '20';
    const year = arr.splice(-1)[0];
    const fullYear = year.length === 2 ? year.padStart(4, dateCenture) : year;

    return isHumanDate
      ? {
        date: `${arr.join('.')}.${fullYear}`
      }
      : {
        date: `${arr.join('.')}.${fullYear}`,
        visibleDate: `${arr.slice(Math.max(arr.length - 2, 0)).join('.')}.${fullYear}`
      }
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

const getDefaultValueByType = (type) => {
  switch (type) {
    case 'string':
      return '';
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return null;
  }
}

function fixContract(data) {
  return data.map(item => {
    const fixedItem = {
      status: item.status,
      title: item.title,
      url: item.url,
      date: item.date,
      order: item.order,
      characters: item.characters,
    };
    if (config.additionalFields) {
      config.additionalFields
        .forEach(({name, type}) => {
          fixedItem[name] = item[name] || getDefaultValueByType(type);
        })
    }
    return fixedItem;
  })
}

module.exports = {
    getForumTopic,
    getForumTopicsByPages,
    sortData,
    fixContract,
    getDefaultValueByType,
};

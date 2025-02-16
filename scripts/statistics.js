const needle = require("needle");
const {loginToBoard} = require("./login");

const moment = require('moment-timezone');
const cheerio = require("cheerio");
const {getDate} = require("./helpers");
moment().tz("Europe/Moscow").format();

const config = require("../configs").configBuilder;

const needlePromise = async (method, url, options, params) => {
  return new Promise((resolve, reject) => {
    needle.request(method, url, options, params, (error, response) => {
      if (error) {
        reject(error);
      }

      resolve(response.body || '');
    })
  });
}

const awaitTimeout = delay => new Promise(resolve => setTimeout(resolve, delay));

async function getStats(from, to) {
  const result = {
    users: {},
    topics: {},
    total: 0,
    errors: 0,
    posts: [],
  };

  const startDate = moment(from, 'DD.MM.YY').startOf('day');
  const endDate = moment(to, 'DD.MM.YY').endOf('day');

  if (! startDate.isValid() || ! endDate.isValid() || endDate.isBefore(startDate)) {
    console.log('Некорректная дата');
    return;
  }

  const url = config.url;
  const loginHash = await loginToBoard();

  const options = loginHash ? {
    json: true,
    headers: {
      cookie: `mybb_ru=${loginHash}`,
    }
  } : {};

  const forums = config.forums || [];
  const forumUsers = config.users || [];

  const forumIds = forums.map(forum => {
    return forum?.url ? new URL(forum.url).searchParams.get('id') : ''
  });

  const topicLinks = [];

  for (let i = 0; i < forumIds.length; i++) {
    process.stdout.write(`Парсинг форумов: ${i+1}/${forumIds.length}`);
    try {
      const page = await needlePromise('get', `${url}viewforum.php?id=${forumIds[i]}&p=-1`, {}, options);
      const $ = cheerio.load(page, {
        pseudos: {
          links: ".tclcon",
          dates: ".tcr > a:not([class])",
        }
      });
      $(":dates").each((i, dateLink) => {
        const text = $(dateLink).text();
        const date = getDate(text);
        if (date.isAfter(startDate)) {
          const href = $($(':links')[i]).find('a').attr('href');
          topicLinks.push(href);
        }
      })
    } catch (e) {
      if (result.errors > 10) return result;
      await awaitTimeout(10000);
      result.errors += 1;
      i--;
      continue;
    }
    await awaitTimeout(200);
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
  }

  for (let j=0; j<topicLinks.length; j++) {
    process.stdout.write(`Парсинг тем: ${j+1}/${topicLinks.length}`);
    try {
      const page = await needlePromise('get', `${topicLinks[j]}&p=-1`, {}, options);
      const $ = cheerio.load(page, {
        pseudos: {
          posts: ".post",
        }
      });
      $(":posts").each((i, post) => {
        const dateLink = $(post).find('.permalink').text();
        const date = getDate(dateLink);
        if (date.isBetween(startDate, endDate, undefined, '[]')) {
          if ($(post).hasClass('topicpost')) return;

          const name = $(post).find('.pa-author a').text()
              || 'x ' + $(post).find('.pa-author').text().split(': ')[1];
          const user = forumUsers.find(twinks => twinks.includes(name));
          const userName = user?.length ? user[0] : name;

          if (!result.users[userName]) {
            result.users[userName] = {
              total: 0,
              profiles: {},
            }
          }
          result.users[userName].total += 1;

          if (!result.users[userName].profiles[name]) {
            result.users[userName].profiles[name] = 0;
          }
          result.users[userName].profiles[name] += 1;

          result.total += 1;
          if (!result.topics[topicLinks[j]]) {
            result.topics[topicLinks[j]] = 0;
          }
          result.topics[topicLinks[j]] += 1;

          const link = $(post).find('.permalink').attr('href');
          result.posts.push([link, date.unix()])
        }
      })
    } catch (e) {
      if (result.errors > 10) return result;
      await awaitTimeout(10000);
      result.errors += 1;
      j--;
      continue;
    }
    await awaitTimeout(200);
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
  }

  return result;
}

const from = process.argv[2];
const to = process.argv[3];

getStats(from, to).then((result) => {
  if (!result || result?.errors) {
    console.log('Скрипт отработал с ошибками');
  } else {
    console.log('Скрипт отработал');
  }

  console.log('');
  console.log(`С ${from} по ${to} написали:`);
  console.log('Постов:', result?.total || 0);
  console.log('Эпизодов:', result?.topics ? Object.keys(result?.topics).length : 0);
  console.log('Постописцев:', result?.users ? Object.keys(result?.users).length : 0);

  console.log('');
  const users = Object.keys(result?.users).sort((a, b) => result?.users[b].total - result?.users[a].total) || [];
  users.forEach((userName) => {
    const { total, profiles } = result?.users[userName];
    console.log(userName, total);
    Object.entries(profiles).forEach(([name, count]) => {
      console.log(`  ${name}: ${count}`);
    })
  });

  console.log('');
  const topics = Object.keys(result?.topics).sort((a, b) => result?.topics[b] - result?.topics[a]) || [];
  topics.forEach((url) => {
    const count = result.topics[url];
    console.log(`${('  ' + count).slice(-3)}| ${url}`);
  })
});

module.exports = {
  getStats,
}

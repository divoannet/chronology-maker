const needle = require("needle");
const {loginToBoard} = require("./login");

const moment = require('moment-timezone');
moment().tz("Europe/Moscow").format();

const config = require("../configs").configBuilder;

const needlePromise = async (method, url, options, params) => {
  return new Promise((resolve, reject) => {
    needle.request(method, url, options, params, (error, response) => {
      if (error) {
        reject(error);
      }

      resolve(response.body?.response || []);
    })
  });
}

const requestTopics = async (url, params, options, startDate) => {
  const result = [];

  const urlParams = new URLSearchParams(params).toString();

  const topicResponse = await needlePromise('get', `${url}/api.php?${urlParams}`, {}, options);

  const filteredTopics = topicResponse.filter(({ last_post_date, num_replies }) => {
    return num_replies !== '0' && moment.unix(last_post_date).isAfter(startDate);
  });

  result.push(...filteredTopics);

  if (topicResponse.length === 100) {
    const nextParams = {
      ...params,
      skip: params.skip ? params.skip + 100 : 100,
    }
    result.push(...await requestTopics(url, nextParams, options, startDate));
  }

  return result;
}

const requestPosts = async (url, params, options, initPosts, startTime, endTime) => {
  const result = [];

  const urlParams = new URLSearchParams(params).toString();

  const postsResponse = await needlePromise('get', `${url}/api.php?${urlParams}`, {}, options);

  const filteredPosts = postsResponse.filter(({ posted, id }) => {
    return !initPosts.includes(id) && posted > startTime && posted < endTime;
  });

  result.push(...filteredPosts);

  if (
    filteredPosts.length > 90
    || (result.length === 0 && filteredPosts.length === 0)
  ) {
    const nextParams = {
      ...params,
      skip: params.skip ? params.skip + 100 : 100,
    }
    result.push(...await requestPosts(url, nextParams, options, initPosts, startTime, endTime));
  }

  return result;
}

async function countPosts() {
  console.log('Считаю посты');
  console.log('----------------');

  const report = {
    users: {},
    topics: {},
  }

  const forums = config.forums;
  const forumUsers = config.users || [];

  const startDate = moment(process.argv[2], 'DD.MM.YY').startOf('day');
  const endDate = moment(process.argv[3], 'DD.MM.YY').endOf('day');
  const notSkipDoubles = process.argv.includes('full');
  const countStats = process.argv.includes('stat');

  if (! startDate.isValid() || ! endDate.isValid() || endDate.isBefore(startDate)) {
    console.log('Некорректная дата');
    return;
  }

  const startTime = startDate.unix();
  const endTime = endDate.unix();

  const url = config.url;
  const loginHash = await loginToBoard();

  const options = loginHash ? {
    json: true,
    headers: {
      cookie: `mybb_ru=${loginHash}`,
    }
  } : {};

  const forumIds = forums.map(forum => {
    return forum?.url ? new URL(forum.url).searchParams.get('id') : ''
  });

  const topicParams = {
    method: 'topic.get',
    forum_id: forumIds.join(','),
    fields: 'id,subject,last_post_date,forum_id,closed,init_post,num_replies',
    sort_by: 'last_post',
    sort_dir: 'desc',
    limit: 100,
  };

  const filteredTopics = await requestTopics(url, topicParams, options, startDate);

  const initPosts = filteredTopics.map(item => item.init_id);

  filteredTopics.forEach(forum => {
    report.topics[forum.id] = {
      id: forum.id,
      subject: forum.subject,
      count: 0,
      posts: [],
    };
  });

  const topicIds = filteredTopics.map(forum => forum.id);

  const postsParams = {
    method: 'post.get',
    topic_id: topicIds.join(','),
    fields: 'id,username,posted,forum_id,topic_id',
    sort_by: 'posted',
    sort_dir: 'desc',
    limit: 100,
  };

  const filteredPosts = await requestPosts(url, postsParams, options, initPosts, startTime, endTime);

  console.log(' ');
  filteredPosts.forEach(post => {
    report.topics[post.topic_id].count += 1;
    report.topics[post.topic_id].posts.push(post.id);
    if (report.users[post.username]) {
      report.users[post.username] += 1;
    } else {
      report.users[post.username] = 1;
    }
  });

  const sortedTopics = Object.values(report.topics)
    .filter(topic => topic.posts.length > 0)
    .map(topic => [topic.count, topic])
    .sort(([count1], [count2]) => count2 - count1)
    .map(([_,topic]) => topic);
  console.log(`Активных эпизодов: ${sortedTopics.length}`);
  sortedTopics.forEach(topic => {
    topic.posts = topic.posts.sort((id1, id2) => id1 - id2);
    const log = notSkipDoubles
      ? topic.posts.map(postId => `${url}/viewtopic.php?pid=${postId}#p${postId}`).join('\n')
      : `${url}/viewtopic.php?pid=${topic.posts[0]}#p${topic.posts[0]} ${topic.count} ${topic.subject}`;
    console.log(log);
  });

  console.log(' ');

  if (countStats) {
    console.log(`Написали постов с ${moment(startDate).format('DD.MM.YY')} по ${moment(endDate).format('DD.MM.YY')}:`);

    const uniqUsers = {};

    Object.entries(report.users).forEach(([author, count]) => {
      const rootUserArr = forumUsers.find(twinks => twinks.includes(author)) || [];
      const rootUser = rootUserArr[0] || author;
      if (uniqUsers[rootUser]) {
        uniqUsers[rootUser].total += count;
        uniqUsers[rootUser].twinks[author] = count;
      }
      else {
        uniqUsers[rootUser] = {
          total: count,
          twinks: {
            [author]: count,
          },
        }
      }
    })

    const sortedUsers = Object.entries(uniqUsers)
      .map(([user, data]) => ([user, data]))
      .sort((item1, item2) => item2[1].total - item1[1].total);

    sortedUsers.forEach(([author, data]) => {
      console.log(`${data.total} | ${author}`);
      if (Object.keys(data.twinks).length > 1 || Object.keys(data.twinks)[0] !== author) {
        Object.entries(data.twinks).forEach(([twink, twinkCount], index) => {
          console.log(`  ${twinkCount} | ${twink}`);
        });
      }
    })

    if (notSkipDoubles) {
      const sortedTopics = Object.values(report.topics)
        .map(topic => [topic.count, topic.subject])
        .sort(([count1], [count2]) => count2 - count1);
      console.log(`Активных эпизодов: ${sortedTopics.length}`)
      sortedTopics.forEach(([count, subject]) => {
        console.log(`${count} | ${subject}`);
      });
    }
  }

  return filteredPosts.length;
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

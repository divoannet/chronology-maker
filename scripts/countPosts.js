const needle = require("needle");
const moment = require("moment");
const {loginToBoard} = require("./login");

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

async function countPosts() {
  console.log('Считаю посты');
  console.log('----------------');

  const report = {
    users: {},
    topics: {},
  }

  const forums = config.forums;

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

  const forumParams = new URLSearchParams({
    method: 'topic.get',
    forum_id: forumIds.join(','),
    fields: 'id,subject,last_post_date,forum_id,closed,init_post',
    sort_by: 'last_post',
    sort_dir: 'desc',
    limit: 100,
  }).toString();

  const response = await needlePromise('get', `${url}/api.php?${forumParams}`, {}, options);

  const filteredTopics = response.filter(({ last_post_date }) => {
    return moment.unix(last_post_date).isBetween(startDate, endDate);
  });

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

  const topicParams = new URLSearchParams({
    method: 'post.get',
    topic_id: topicIds.join(','),
    fields: 'id,username,posted,forum_id,topic_id',
    sort_by: 'posted',
    sort_dir: 'desc',
    limit: 100,
  }).toString();

  const topicResponse = await needlePromise('get', `${url}/api.php?${topicParams}`, {}, options);

  const filteredPosts = topicResponse.filter(({ posted, id }) => {
    return !initPosts.includes(id) && posted > startTime && posted < endTime;
  });

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
    .map(topic => [topic.count, topic])
    .sort(([count1], [count2]) => count2 - count1)
    .map(([_,topic]) => topic);
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
    const sortedUsers = Object.entries(report.users)
      .map(([author, count]) => [count, author])
      .sort(([count1], [count2]) => count2 - count1);
    sortedUsers.forEach(([count, author]) => {
      console.log(`${count} | ${author}`)
    });
    console.log(' ');

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

function shuffle(array) {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
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

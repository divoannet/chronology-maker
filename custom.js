const config = require("./configs").configBuilder;

console.log(config);

// const outputPath = `./data/${config.forumName}.json`;
// const data = require(outputPath);

// // some code here
// const olddata = require(`./data/${config.forumName}old.json`);

// const newData = [];

// olddata.forEach(oldtopic => {
//     const newtopic = data.find(topic => topic.url === oldtopic.url);
//     if (!newtopic) {
//         newData.push(oldtopic);
//         return;
//     }
//     const topic = {
//         ...oldtopic,
//         ...newtopic
//     };
//     topic.categories = oldtopic.categories.split(' ');
//     newData.push(topic);
// });

// console.log(newData[100]);
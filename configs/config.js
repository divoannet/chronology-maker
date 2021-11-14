/**
 * to build your config copy this file with filename config.CONFIG_PATH.js
 */

module.exports = {
    "forumName": "fileOfJsonName",
    "forums": [
        {
            url: "",
            id: "completed"
        },
        {
            url: "",
            id: "uncompleted"
        },
        {
            url: "",
            id: 'remove',
            remove: true
        }
    ],
    "additionalFields": [
        {
            name: 'description',
            type: 'string',
        },
    ],
    "replace": {
        "oldCharName": "newCharName"
    },
    "ignore": [
        "http://link_to_ignored_topic"
    ]
};

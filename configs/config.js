/**
 * to build your config copy this file with filename config.CONFIG_PATH.js
 */

module.exports = {
    "url": "",                      // ссылка на форум
                                    // не обязательно, если игровые разделы открыты:
    "login": "login",               // логин аккаунта читателя, с него должны быть видны все игровые и архивные разделы
    "password": "password",         // пароль аккаунта читателя

    "forumName": "fileOfJsonName",
    "formatDate": true,             // нужно ли форматировать даты
    "systemDateFormat": "YYYY-MM-DD HH:mm:ss", // формат дат, указанный в настройках форума
    "dateSeparator": "[]",          // как отделяется дата эпизода в названии темы
    "dateCenture": "20",            // если в дате эпизода используется сокращённая запись даты DD.MM.YY, указать век
    "updateStatus": "actual",       // только эпизоды в этом статусе будут обновлять участников
    "forums": [                     // список игровых разделов и меток для них
        {
            url: "",
            id: "completed"
        },
        {
            url: "",
            id: "uncompleted"
        },
        {
            url: "",        // ссылка на раздел
            id: 'remove',   // статус эпизода в этом разделе
            remove: true    // нужно ли удалять из хронологии
        }
    ],
    "additionalFields": [           // доп поля таблицы под ручное заполнение
        {
            name: 'description',
            type: 'string',
        },
    ],
    "replace": {
        "oldCharName": "newCharName"    // если аккаунт переименован, а персонаж тот же
    },
    "ignoreUsers": ['Celestia'],        // технические аккаунты
    "ignore": [                         // темы в разделах с эпизодами, не являющиеся эпизодами (шаблоны, например)
        "http://link_to_ignored_topic"
    ]
};

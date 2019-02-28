const config = require("../configs").configBuilder;

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
      data.push({
        status: forum.id,
        url,
        title: getTitle(fullTitle),
        date: formatDate(dateMatch, fullTitle, url, forum)
      });
      if (forum.remove) {
        data[data.length - 1].remove = true;
      }
    });
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
        return '';
    }
    const date = dateMatch[0];

    if (!config.formatDate) {
        return date;
    }

    const arr = date.split('.');

    if (arr.length === 1) {
        return date;
    }

    const year = arr.slice(-1);

    return `${arr.join('.')}.${year}`;
}

module.exports = {
    getForumTopic
};
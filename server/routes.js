const { countPosts } = require('../scripts/countPosts');
const {getStats} = require("../scripts/statistics");

module.exports = function(app, db) {
  app.get('/report', async (req, res) => {

    if (!(req.query.from && req.query.to)) {
      res.status(500).send('Неправильный формат запроса');
      return;
    }

    const report = await countPosts(req.query.from, req.query.to, true);

    res.send(report);
  });
  app.get('/stats', async (req, res) => {

    if (!(req.query.from && req.query.to)) {
      res.status(500).send('Неправильный формат запроса');
      return;
    }

    const report = await getStats(req.query.from, req.query.to);

    res.send(report);
  });
};

const express        = require('express');
const MongoClient    = require('mongodb').MongoClient;
const bodyParser     = require('body-parser');
const db             = require('./db');
const cors = require('cors');

const port = 8006;

const app = express();
const corsOptions = {
  origin: '*',
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

const start = async () => {
  app.use(cors(corsOptions));
  app.set('json spaces', 2);

  app.use(bodyParser.urlencoded({ extended: false }));

  const client = new MongoClient(db.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await client.connect();

  const database = client.db('chrono');

  require('./routes')(app, database);

  app.listen(port, () => {
    console.log('We are live on ' + port);
  });
};

start();
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import dayjs from 'dayjs';
import chalk from 'chalk';
import os from 'os';
import { schParticipants, schMessagesBody, schHeaderUser } from './schemas.js';
dotenv.config();

const PORT = 5000;
const myIp = os.networkInterfaces().eth0[0].address;

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

try {
  console.log(chalk.yellow('Connecting...'));
  await mongoClient.connect();
  db = mongoClient.db();
  app.listen(PORT, () => {
    console.log(chalk.green('Connected!'));
    console.log(
      `${chalk.hex('#259dff').bold('Express')}: ${chalk.hex('#20c20e')(
        `${myIp}:${PORT}`
      )}`
    );
    console.log(
      `${chalk.hex('#00684a').bold('MongoDB')}: ${chalk.hex('#20c20e')(
        process.env.DATABASE_URL
      )}`
    );
    console.log(
      `${chalk.hex('#016bf8').bold('Database')}: ${chalk.hex('#20c20e')(
        db.namespace
      )}`
    );
    removeInactive();
  });
} catch (error) {
  console.error(chalk.red('mongoClient.connect() error!'), error);
}

// endpoints start
app.post('/participants', async (req, res) => {
  try {
    if (!validData(schParticipants, req.body)) {
      return res.sendStatus(422);
    }
    if (await nameExists(req.body.name)) {
      return res.sendStatus(409);
    } else {
      const now = dayjs();
      await db
        .collection('participants')
        .insertOne({ ...req.body, lastStatus: now.valueOf() });
      await insertMessage(
        req.body.name,
        'Todos',
        'entra na sala...',
        'status',
        now.format('HH:mm:ss')
      );
      return res.sendStatus(201);
    }
  } catch (error) {
    console.error("post '/participants' error!", error);
    return res.sendStatus(500);
  }
});
app.get('/participants', async (_req, res) => {
  try {
    const data = await db.collection('participants').find().toArray();
    return res.send(data);
  } catch (error) {
    console.error("get '/participants' error!", error);
    return res.sendStatus(500);
  }
});
app.post('/messages', async (req, res) => {
  try {
    const anyInvalidData =
      !validData(schMessagesBody, req.body) ||
      !validData(schHeaderUser, req.headers.user);
    if (anyInvalidData) {
      return res.sendStatus(422);
    }
    if (await nameExists(req.headers.user)) {
      const now = dayjs();
      await insertMessage(
        req.headers.user,
        req.body.to,
        req.body.text,
        req.body.type,
        now.format('HH:mm:ss')
      );
      return res.sendStatus(201);
    } else {
      return res.sendStatus(422);
    }
  } catch (error) {
    console.error("post '/messages' error!", error);
    return res.sendStatus(500);
  }
});
app.get('/messages', async (req, res) => {
  try {
    const validQueryLimit =
      !!req.query.limit &&
      Number.isInteger(+req.query.limit) &&
      +req.query.limit > 0;
    if (!!req.query.limit && !validQueryLimit) {
      return res.sendStatus(422);
    }
    const query = {
      $or: [
        { type: 'message' },
        { type: 'status' },
        { from: req.headers.user },
        { to: req.headers.user },
      ],
    };
    const data = await db
      .collection('messages')
      .find(query)
      .sort({ $natural: validQueryLimit ? -1 : 1 })
      .limit(validQueryLimit ? +req.query.limit : 0)
      .toArray();
    return res.send(data);
  } catch (error) {
    console.error("get '/messages' error!", error);
    return res.sendStatus(500);
  }
});
app.post('/status', async (req, res) => {
  try {
    if (!validData(schHeaderUser, req.headers.user)) {
      return res.sendStatus(404);
    }
    const name = await nameExists(req.headers.user);
    if (name) {
      const now = dayjs();
      await db
        .collection('participants')
        .updateOne({ _id: name._id }, { $set: { lastStatus: now.valueOf() } });
      return res.sendStatus(200);
    } else {
      return res.sendStatus(404);
    }
  } catch (error) {
    console.error("post '/status' error!", error);
    return res.sendStatus(500);
  }
});
// endpoints finish

const validData = (schema, data) => !schema.validate(data).error;

const nameExists = async (name) =>
  db.collection('participants').findOne({ name });

const insertMessage = async (from, to, text, type, time) =>
  db.collection('messages').insertOne({ from, to, text, type, time });

async function removeInactive(timer = 15000) {
  setInterval(async () => {
    try {
      const now = dayjs();
      const tooOld = now.valueOf() - timer;
      const query = { lastStatus: { $lte: tooOld } };
      const myDocs = await db.collection('participants').find(query).toArray();

      for (const myDoc of myDocs) {
        await db.collection('participants').deleteOne({ _id: myDoc._id });
        await insertMessage(
          myDoc.name,
          'Todos',
          'sai da sala...',
          'status',
          now.format('HH:mm:ss')
        );
      }
    } catch (error) {
      console.error('removeInactive() error!', error);
    }
  }, timer);
}

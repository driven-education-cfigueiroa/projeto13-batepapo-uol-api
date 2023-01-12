
import os from 'os';
import dayjs from 'dayjs';
import chalk from 'chalk';
import express from 'express';
import cors from 'cors';
import * as schema from './schemas.js'
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const PORT = 5000;
const myIp = os.networkInterfaces().eth0[0].address;

const app = express();

app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.DATABASE_URL)

let db;

try {
    mongoClient.connect()
    db = mongoClient.db();
    console.log("Connected!")
} catch (error) {
    console.log(error)
}

app.post('/participants', async (req, res) => {
    try {
        const bodyIsValid = !schema.participants.validate(req.body).error;
        if (!bodyIsValid) {
            return res.sendStatus(422);
        }
        const result = await db.collection('participants').findOne({ name: req.body.name });
        if (result) {
            return res.sendStatus(409);
        } else {
            const now = dayjs();
            await db.collection('participants').insertOne({ ...req.body, lastStatus: now.valueOf() });
            await db.collection('messages').insertOne({ from: req.body.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: now.format('HH:mm:ss') });
            return res.sendStatus(201);
        }
    } catch (error) {
        console.log(error)
        return res.sendStatus(500);
    }
});

app.get('/participants', async (_req, res) => {
    try {
        const data = await db.collection('participants').find().toArray();
        return res.send(data);
    } catch (error) {
        console.log(error)
        return res.sendStatus(500);
    }
})

app.post('/messages', async (req, res) => {
    try {
        const bodyIsValid = !schema.messagesBody.validate(req.body).error
        const headerIsValid = !schema.HeaderUser.validate(req.headers.user).error

        if (!bodyIsValid || !headerIsValid) {
            return res.sendStatus(422);
        }

        const now = dayjs();
        const result = await db.collection('participants').findOne({ name: req.headers.user });
        if (result) {
            await db.collection('messages').insertOne({ from: req.headers.user, to: req.body.to, text: req.body.text, type: req.body.type, time: now.format('HH:mm:ss') });
            return res.sendStatus(201);
        } else {
            return res.sendStatus(422);
        }
    } catch (error) {
        console.log(error)
        return res.sendStatus(500);
    }
});

app.get('/messages', async (req, res) => {
    try {
        const queryisValid = !!req.query.limit && Number.isInteger(+req.query.limit) && +req.query.limit > 0
        const headerIsValid = !schema.HeaderUser.validate(req.headers.user).error

        if (!headerIsValid) {
            return res.sendStatus(401);
        } else {
            const query = { $or: [{ type: 'message' }, { type: 'status' }, { from: req.headers.user }, { to: req.headers.user }] }
            const data = await db.collection('messages').find(query).limit(queryisValid ? +req.query.limit : Infinity).toArray();
            return res.send(data);
        }
    } catch (error) {
        console.log(error)
        return res.sendStatus(500);
    }
});

app.post('/status', async (req, res) => {
    try {
        const headerIsValid = !schema.HeaderUser.validate(req.headers.user).error

        if (!headerIsValid) {
            return res.sendStatus(404);
        }

        const now = dayjs();
        const result = await db.collection('participants').findOne({ name: req.headers.user });
        if (result) {
            await db.collection('participants').updateOne({ _id: result._id }, { $set: { lastStatus: now.valueOf() } });
            return res.sendStatus(200);
        } else {
            return res.sendStatus(404);
        }
    } catch (error) {
        console.log(error)
        return res.sendStatus(500);
    }
});

async function removeInactive(timer = 15000) {
    setInterval(async () => {
        try {
            const now = dayjs();
            const tooOld = now.valueOf() - timer;
            const query = { lastStatus: { $lte: tooOld } };
            const myDocs = await db.collection('participants').find(query).toArray();

            for (const myDoc of myDocs) {
                await db.collection('participants').deleteOne({ _id: myDoc._id });
                await db.collection('messages').insertOne({ from: myDoc.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: now.format('HH:mm:ss') });
            }
        } catch (error) {
            console.log(error)
        }
    }, timer);
}

app.listen(PORT, () => {
    console.log(chalk.hex('#259dff').bold('Express') + ': ' + chalk.hex('#20c20e')(myIp + ':' + PORT));
    console.log(chalk.hex('#00684a').bold('MongoDB') + ': ' + chalk.hex('#20c20e')(process.env.DATABASE_URL));
    console.log(chalk.hex('#016bf8').bold("Database") + ": " + chalk.hex('#20c20e')(db.namespace))
});

removeInactive();

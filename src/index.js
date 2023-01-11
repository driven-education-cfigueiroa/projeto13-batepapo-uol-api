
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

mongoClient.connect().then(() => {
    db = mongoClient.db();
})

app.post('/participants', (req, res) => {
    const hasError = !!schema.participants.validate(req.body).error;
    if (hasError) {
        return res.sendStatus(422);
    }
    let now = dayjs();
    db.collection('participants').insertOne({ ...req.body, lastStatus: now.valueOf() }).then(() => {
        db.collection('messages').insertOne({ from: req.body.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: now.format('HH:mm:ss') }).then(() => {
            return res.sendStatus(201);
        })
    })
})

app.get('/participants', (_req, res) => {
    db.collection('participants').find().toArray().then(data => {
        return res.send(data);
    })
})

app.post('/messages', (req, res) => {
    const hasError = !!schema.messages.validate(req.body).error;
    if (hasError) {
        return res.sendStatus(422);
    }
    return res.send('Ok');
})

app.get('/messages', (req, res) => { })

app.post('/status', (req, res) => { })

app.listen(PORT, () => {
    console.log(chalk.hex('#00684a').bold('MongoDB') + ': ' + chalk.hex('#20c20e')(process.env.DATABASE_URL));
    console.log(chalk.hex('#259dff').bold('Express') + ': ' + chalk.hex('#20c20e')(myIp + ':' + PORT));
})
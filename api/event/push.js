import { Pool } from 'pg';
import webPush from 'web-push';

webPush.setVapidDetails(
    'https://catchthe.run/',
    'BJMQ-CpMM_-OoO2hNPt3oM_pM8TSpPhSL_rGwGix99iLj0hdyHCZTP3XYeOO8sf9ghhHHFO2I7QpDrgSyGd1VQ4',
    'S_3sQfZvYAh7LGuKkXreV_kfcmAkdNFL0nAoI2z1P3w'
);

const checkAgainstFilter = (category, filter) => {
    if (filter === undefined) return true;

    const gameTitle = category.slice(0, category.indexOf('_'));

    for (const filterGame of filter.Games.values) {
        if (gameTitle === filterGame) return true;
    }

    for (const filterCategory of filter.Categories.values) {
        if (category === filterCategory) return true;
    }

    return false;
};

module.exports = async (req, res) => {
    console.log('req.body:', req.body);
    // const { Producer, Game, Category, Message } = req.body;

    const pool = new Pool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
    });

    res.status(200).send();
    return;

    try {
        const allPushSubs = (await dynamoClient.query(getAllPushSubsQueryParams).promise()).Items;

        const massPushResults = await Promise.all(
            allPushSubs.map(async sub => (
                checkAgainstFilter(Category, sub.Filter)
                    ? await webPush.sendNotification(JSON.parse(sub.SRT.slice(6)), Message)
                    : false
            ))
        );

        res.status(200).send(massPushResults ? true : false);
    } catch (e) {
        res.status(500).send('Error sending push notifications:', e);
    }
};
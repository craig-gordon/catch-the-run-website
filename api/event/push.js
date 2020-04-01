import { Pool } from 'pg';
import webPush from 'web-push';

webPush.setVapidDetails(
    'https://catchthe.run/',
    'BJMQ-CpMM_-OoO2hNPt3oM_pM8TSpPhSL_rGwGix99iLj0hdyHCZTP3XYeOO8sf9ghhHHFO2I7QpDrgSyGd1VQ4',
    'S_3sQfZvYAh7LGuKkXreV_kfcmAkdNFL0nAoI2z1P3w'
);

const isWhitelisted = (game, category, whitelist) => {
    for (const item of whitelist) {
        if (item === true) {
            return true;
        } else if (item.includes('|')) {
            if (item === `${game}|${category}`) return true;
        } else {
            if (item === game) return true;
        }
    }

    return false;
};

module.exports = async (req, res) => {
    console.log('req.body:', req.body);
    const { Producer, Game, Category, SplitName, Pace, Message, Timestamp } = JSON.parse(req.body);

    const pool = new Pool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
    });

    try {
        const dbRes = await pool.query(
            `SELECT subscription_.endpoint, subscription_.whitelisted, user_.id
            FROM subscription_, user_
            WHERE user_.twitch_name = $1 AND domain = 'Push'`,
            [Producer]
        );

        const allPushSubs = dbRes.rows;

        const massPushResults = await Promise.all(
            allPushSubs.map(async sub => (
                isWhitelisted(Game, Category, sub.whitelisted)
                    ? await webPush.sendNotification(JSON.parse(sub.endpoint), Message)
                    : false
            ))
        );

        await pool.query(
            `INSERT INTO event_ (producer_id, game_id, category_id, split_name, pace, message, timestamp)
            values ($1, ${game.id}, ${category.id}, $2, $3, $4, $5)`,
            [dbRes.rows[0].id, SplitName, Pace, Message, Timestamp]
        );

        res.status(200);
    } catch (e) {
        res.status(500).send('Error sending push notifications:', e);
    }
};
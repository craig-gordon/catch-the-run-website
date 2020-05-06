import { Pool } from 'pg';
import webPush from 'web-push';
import axios from 'axios';

webPush.setVapidDetails(
    'https://catchthe.run/',
    'BJMQ-CpMM_-OoO2hNPt3oM_pM8TSpPhSL_rGwGix99iLj0hdyHCZTP3XYeOO8sf9ghhHHFO2I7QpDrgSyGd1VQ4',
    'S_3sQfZvYAh7LGuKkXreV_kfcmAkdNFL0nAoI2z1P3w'
);

module.exports = async (req, res) => {
    console.log('req.body:', req.body);
    const {
        EventType,
        EventSource,
        Producer,
        Game,
        Category,
        SplitName,
        Pace,
        Message,
        Timestamp
    } = req.body;

    const pool = new Pool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
    });

    try {
        const subs = (await pool.query(
            `SELECT
                sub.id,
                sub.subscription_domain AS domain,
                sub.discord_subscription_type AS type,
                COALESCE (
                    sub.endpoint,
                    consumer.discord_server_channel_id,
                    mention_server.discord_server_channel_id
                ) AS endpoint,
                al_item.allow_all
            FROM
                subscription AS sub
                JOIN app_user AS producer ON sub.producer_id = producer.id
                JOIN app_user AS consumer ON sub.consumer_id = consumer.id
                LEFT JOIN app_user AS mention_server ON sub.discord_mention_server_id = mention_server.id
                JOIN allowlist_item AS al_item ON al_item.subscription_id = sub.id
                LEFT JOIN game ON al_item.game_id = game.id
                LEFT JOIN category ON al_item.category_id = category.id
            WHERE
                producer.twitch_name = $1
                AND (
                    al_item.allow_all = true
                    OR (
                        game.title = $2
                        AND (category.name IS NULL OR category.name = $3)
                    )
                )`,
            [Producer, Game, Category]
        )).rows;

        console.log('subs:', subs);

        const processedSubs = {};
        const discordServers = {};

        const massPushResults = await Promise.all(
            subs.map(sub => {
                console.log('sub:', sub);
                if (!processedSubs[sub.id]) {
                    processedSubs[sub.id] = true;
                    if (sub.domain === 'push') return webPush.sendNotification(JSON.parse(sub.endpoint), Message);
                    else if (sub.domain === 'discord') return sendDiscordNotification(sub.endpoint, Message);
                }
            })
        );

        console.log('results:', massPushResults);

        await pool.query(
            `INSERT INTO event (producer_id, game_id, category_id, split_name, pace, message, created_at)
            values ($1, ${game.id}, ${category.id}, $2, $3, $4, $5)`,
            [allowlistItemsBySub[0].id, SplitName, Pace, Message, Timestamp]
        );

        res.status(200);
    } catch (e) {
        res.status(500).send('Error sending notifications to subscribers:', e);
    }
};

const sendDiscordNotification = (endpoint, message) => {
    return axios.post(
        `https://discordapp.com/api/channels/${endpoint}/messages`,
        {
            content: message
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`
            }
        }
    );
};
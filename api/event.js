import { Pool } from 'pg';
import webPush from 'web-push';
import axios from 'axios';
import ApiExecutionContext from '../apiExecutionContext.js';

webPush.setVapidDetails(
    'https://catchthe.run/',
    'BJMQ-CpMM_-OoO2hNPt3oM_pM8TSpPhSL_rGwGix99iLj0hdyHCZTP3XYeOO8sf9ghhHHFO2I7QpDrgSyGd1VQ4',
    'S_3sQfZvYAh7LGuKkXreV_kfcmAkdNFL0nAoI2z1P3w'
);

module.exports = async (req, res) => {
    const ctx = new ApiExecutionContext(req, res, Date.now(), '/api/event');
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

    if (req.headers['x-producer-key'] === undefined) return ctx.endApiExecution(null, 401, 'No Producer Key provided');

    const pool = new Pool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
    });

    let producerRecord;
    try {
        const producerRes = (await pool.query(
            `SELECT
                producer.id,
                producer.producer_key
            FROM app_user AS producer
            WHERE producer.twitch_name = $1`,
            [Producer]
        ));

        if (producerRes.rowCount === 0) return ctx.endApiExecution(null, 400, 'Specified Producer is not registered with Catch The Run');
        if (producerRes.rowCount > 1) return ctx.endApiExecution('Multiple Producer records mapped to the same Twitch Username', 500, null);
        if (producerRes.rows[0].producer_key !== req.headers['x-producer-key']) return ctx.endApiExecution(null, 401, 'Incorrect Producer Key provided');

        producerRecord = producerRes.rows[0]; 
    } catch (err) {
        return ctx.endApiExecution(`Error getting Producer record: ${err}`, 500, null);
    }

    const gameCategoryRes = pool.query(
        `SELECT
            game.id AS game_id,
            category.id AS category_id
        FROM game
            INNER JOIN category ON game.id = category.game_id
        WHERE game.title = $1
            AND category.name = $2`,
        [Game, Category]
    );

    let subs;
    try {
        subs = (await pool.query(
            `SELECT
                consumer.twitch_name AS consumer_twitch_name,
                sub.id AS sub_id,
                sub.subscription_domain AS domain,
                sub.discord_subscription_type AS type,
                COALESCE (
                    sub.endpoint,
                    consumer.discord_id
                ) AS endpoint,
                COALESCE (
                    mention_server.discord_server_channel_id,
                    consumer.discord_server_channel_id,
                    consumer.discord_dm_channel_id
                ) AS discord_channel_id,
                al_item.allow_all AS al_allow_all,
                game.title AS al_game_title,
                category.name AS al_category_name
            FROM
                subscription AS sub
                JOIN app_user AS producer ON sub.producer_id = producer.id
                JOIN app_user AS consumer ON sub.consumer_id = consumer.id
                LEFT JOIN app_user AS mention_server ON sub.discord_mention_server_id = mention_server.id
                LEFT JOIN allowlist_item AS al_item ON al_item.subscription_id = sub.id
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
    } catch (err) {
        return ctx.endApiExecution(`Error getting Subscription records: ${err}`, 500, null);
    }

    console.log('subs:', subs);

    const subDeduplicationTracker = {};
    const groupedSubs = {};

    subs.forEach(sub => {
        if (subDeduplicationTracker[sub.sub_id]) return ctx.logger.warn(`Duplicate subscription/allowlist item found: ${sub}`);
        else subDeduplicationTracker[sub.sub_id] = true;

        if (sub.domain === 'discord') {
            if (sub.type === 'dm') {
                groupedSubs[sub.discord_channel_id] = { domain: 'discord', message: Message };
            } else if (sub.type === 'server') {
                if (groupedSubs[sub.discord_channel_id]) groupedSubs[sub.discord_channel_id].message = `${Message}${groupedSubs[sub.discord_channel_id].message}`;
                else groupedSubs[sub.discord_channel_id] = { domain: 'discord', message: Message };
            } else if (sub.type === '@') {
                if (groupedSubs[sub.discord_channel_id]) groupedSubs[sub.discord_channel_id].message = `${groupedSubs[sub.discord_channel_id].message} <@${sub.endpoint}>`;
                else groupedSubs[sub.discord_channel_id] = { domain: 'discord', message: ` <@${sub.endpoint}>` };
            }
        } else if (sub.domain === 'push') {
            groupedSubs[sub.endpoint] = { domain: 'push', message: Message };
        }
    });

    const notificationsResults = await Promise.all(
        Object.entries(groupedSubs).map(([uri, sub]) => {
            if (sub.domain === 'push') return webPush.sendNotification(JSON.parse(uri), sub.message);
            else if (sub.domain === 'discord') return sendDiscordNotification(uri, sub.message);
        })
    );

    let gameCategoryRecord;
    try {
        gameCategoryRecord = (await gameCategoryRes).rows[0];
    } catch (err) {
        return ctx.endApiExecution(`Error getting Game/Category record: ${err}`, 500, null);
    }

    try {
        await pool.query(
            `INSERT INTO event (producer_id, game_id, category_id, split_name, pace, message, created_at)
            values ($1, $2, $3, $4, $5, $6, $7)`,
            [producerRecord.id, gameCategoryRecord.game_id, gameCategoryRecord.category_id, SplitName, Pace, Message, Timestamp]
        );
    } catch (err) {
        return ctx.endApiExecution(`Error inserting new Event: ${err}`, 500, null);
    }

    ctx.successfulMessagesCount = notificationsResults.filter(res => res.statusCode === 201 || res.status === 200).length;
    return ctx.endApiExecution(null, 200, null);
};

const sendDiscordNotification = (channelId, message) => {
    return axios.post(
        `https://discordapp.com/api/channels/${channelId}/messages`,
        { content: message },
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`
            }
        }
    );
};
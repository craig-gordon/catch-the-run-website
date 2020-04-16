import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

module.exports = async (req, res) => {
    console.log('req.headers:', req.headers);
    console.log('req.body:', req.body);

    const { idToken } = req.body;
    const decoded = jwt.decode(idToken);
    const username = decoded.preferred_username;
    const twitchId = decoded.sub;

    console.log('idToken:', idToken, 'decoded:', decoded, 'username:', username, 'twitchId:', twitchId);

    const pool = new Pool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
    });

    try {
        const getProducerRes = await pool.query(
            `SELECT id, producer_key
            FROM user_
            WHERE user_.twitch_id = $1`,
            [twitchId]
        );

        console.log('getProducerRes:', getProducerRes);

        if (producerRecordFound(getProducerRes)) {
            const producerRow = getProducerRes.rows[0];

            if (hasExistingProducerKey(producerRow)) {
                const updateRes = await pool.query(
                    `UPDATE user_
                    SET is_producer = true, twitch_name = $1
                    WHERE user_.id = $2`,
                    [username, producerRow.id]
                );
                console.log(updateRes);
                res.status(200).send({ TwitchUsername: username, TwitchUserId: twitchId, ProducerKey: producerRow.producer_key });
            } else {
                const newKey = uuidv4();
                const updateRes = await pool.query(
                    `UPDATE user_
                    SET is_producer = true, twitch_name = $1, producer_key = $2
                    WHERE user_.id = $3`,
                    [username, newKey, producerRow.id]
                );
                console.log(updateRes);
                res.status(200).send({ TwitchUsername: username, TwitchUserId: twitchId, ProducerKey: newKey });
            }
        } else if (noproducerRecordFound(getProducerRes)) {
            const newKey = uuidv4();
            const insertRes = await pool.query(
                `INSERT INTO user_ (is_consumer, is_producer, is_discord_server, twitch_id, twitch_name, producer_key)
                values (false, true, false, $1, $2, $3)`,
                [twitchId, username, newKey]
            );
            console.log('insertRes:', insertRes);
            res.status(200).send({ TwitchUsername: username, TwitchUserId: twitchId, ProducerKey: newKey });
        } else {
            console.log(`Error occurred: multiple records found for twitchId ${twitchId}`);
            res.status(500).send({ TwitchUsername: null, TwitchUserId: null, ProducerKey: null });
        }
    } catch (err) {
        console.log(`Error occurred verifying Producer: ${err}`);
        res.status(500).send({ TwitchUsername: null, TwitchUserId: null, ProducerKey: null });
    }
};

const producerRecordFound = dbRes => dbRes.rowCount === 1;
const noproducerRecordFound = dbRes => dbRes.rowCount === 0;
const hasExistingProducerKey = dbRow => dbRow.producer_key !== null;
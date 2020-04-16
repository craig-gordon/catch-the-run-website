import { Pool } from 'pg';

module.exports = async (req, res) => {
    const producerKey = req.headers['x-producer-key'];
    const { TwitchId, Game, Category } = req.body;

    console.log('req.headers:', req.headers);
    console.log('req.body:', req.body);
    console.log('req.method:', req.method);

    const pool = new Pool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
    });

    if (req.method === 'POST') {
        try {
            const checkKeyRes = await pool.query(
                `SELECT producer_key
                FROM user_
                WHERE user_.twitch_id = $1`,
                [TwitchId]
            );

            const producerRow = checkKeyRes.rows[0];

            if (producerRow) {
                if (producerRow.producer_key === producerKey) {
                    // TODO: add actual db logic

                    res.status(200).send();
                } else {
                    console.log('Incorrect producer key for the provided Twitch id:', producerKey, TwitchId);
                    res.status(403).send('The provided producer credentials were invalid. Access denied.');
                }
            } else {
                console.log('No producer record found for Twitch user id:', TwitchId);
                res.status(400).send('Could not find a producer record for the provided Twitch user ID.');
            }
        } catch (err) {
            console.log('Error checking the Producer Key:', producerKey);
            res.status(500).send('An error occurred checking attempting to register the category. Please try again later.');
        }
    } else if (req.method === 'DELETE') {
        // TODO: add delete category
    }
};
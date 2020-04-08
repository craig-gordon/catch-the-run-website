import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

console.log('window.external:', window.external);
console.log('window.location:', window.location);

if (window.external) {
    const guid = window.external;
    const idToken = window.location.slice(window.location.indexOf('id_token=') + 'id_token='.length);
    const decoded = jwt.decode(idToken);
    const username = decoded.preferred_username;
    const twitchId = decoded.sub;

    const pool = new Pool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
    });

    try {
        const existingProducerRes = await pool.query(
            `SELECT client_key
            FROM user_
            WHERE user_.twitch_id = $1`,
            [twitchId]
        );

        if (existingProducerRes.rows && existingProducerRes.rows[0]) {
            await pool.query(
                `UPDATE user_
                SET is_producer = true, twitch_id = $1, twitch_name = $2, client_key = $3
                WHERE user_.id = $4`,
                [twitchId, username, guid, existingProducerRes.rows[0].id]
            );
            window.registrationConfirmed = true;
        } else if (existingProducerRes.rows && existingProducerRes.rows.length === 0) {
            await pool.query(
                `INSERT INTO user_ (is_consumer, is_producer, is_discord_server, twitch_id, twitch_name, client_key)
                values (false, true, false, $1, $2, $3)`,
                [twitchId, username, guid]
            );
            window.registrationConfirmed = true;
        }
}
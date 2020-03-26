const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

(async function() {
    try {
        await pool.query( // consumer
            `CREATE TABLE IF NOT EXISTS consumer(
                id serial PRIMARY KEY,
                twitch_id varchar(8) UNIQUE,
                twitch_name varchar(32) UNIQUE,
                discord_id varchar(24) UNIQUE,
                discord_name varchar(32),
                is_producer boolean NOT NULL,
                client_key varchar(32) UNIQUE,
                is_discord_server boolean NOT NULL
            )`
        );
        await pool.query( // game
            `CREATE TABLE IF NOT EXISTS game(
                id serial PRIMARY KEY,
                title varchar(64) NOT NULL,
                abbreviation varchar(64) NOT NULL,
                platform varchar(32)
            )`
        );
        await pool.query( // category
            `CREATE TABLE IF NOT EXISTS category(
                id serial PRIMARY KEY,
                name varchar(64) NOT NULL,
                game_id integer NOT NULL REFERENCES game(id) ON DELETE CASCADE,
                tracked boolean
            )`
        );
        await pool.query( // producer_category
            `CREATE TABLE IF NOT EXISTS producer_category(
                id serial PRIMARY KEY,
                producer_id integer NOT NULL REFERENCES consumer(id) ON DELETE CASCADE,
                category_id integer NOT NULL REFERENCES category(id) ON DELETE CASCADE
            )`
        );
        await pool.query( // subscription
            `CREATE TABLE IF NOT EXISTS subscription(
                id serial PRIMARY KEY,
                consumer_id integer REFERENCES consumer(id) ON DELETE SET NULL,
                producer_id integer REFERENCES consumer(id) ON DELETE SET NULL,
                discord_mention_server_id integer REFERENCES consumer(id) ON DELETE SET NULL,
                domain varchar(10) NOT NULL,
                type varchar(10),
                endpoint varchar(400) NOT NULL,
                included jsonb NOT NULL,
                timestamp timestamptz NOT NULL
            )`
        );
        await pool.query( // event
            `CREATE TABLE IF NOT EXISTS event(
                id serial PRIMARY KEY,
                producer_id integer REFERENCES consumer(id) ON DELETE SET NULL,
                game_id integer REFERENCES game(id) ON DELETE SET NULL,
                category_id integer REFERENCES category(id) ON DELETE SET NULL,
                split_name varchar(64),
                pace varchar(24),
                message text,
                timestamp timestamptz NOT NULL
            )`
        );
    } catch (e) {
        console.log(e);
    }
})();
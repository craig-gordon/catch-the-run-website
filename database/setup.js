const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

(async function() {
    try {
        await pool.query( // user_
            `CREATE TABLE IF NOT EXISTS user_(
                id serial PRIMARY KEY,
                is_consumer boolean NOT NULL,
                is_producer boolean NOT NULL,
                is_discord_server boolean NOT NULL,
                twitch_id varchar(8) UNIQUE,
                twitch_name varchar(32) UNIQUE,
                discord_id varchar(24) UNIQUE,
                discord_name varchar(32),
                producer_key varchar(64) UNIQUE
            )`
        );
        await pool.query( // game_
            `CREATE TABLE IF NOT EXISTS game_(
                id serial PRIMARY KEY,
                title varchar(64) NOT NULL,
                abbreviation varchar(64) NOT NULL,
                platform varchar(32)
            )`
        );
        await pool.query( // category_
            `CREATE TABLE IF NOT EXISTS category_(
                id serial PRIMARY KEY,
                name varchar(64) NOT NULL,
                game_id integer NOT NULL REFERENCES game_(id) ON DELETE CASCADE,
                tracked boolean
            )`
        );
        await pool.query( // producer_category_
            `CREATE TABLE IF NOT EXISTS producer_category_(
                id serial PRIMARY KEY,
                producer_id integer NOT NULL REFERENCES user_(id) ON DELETE CASCADE,
                category_id integer NOT NULL REFERENCES category_(id) ON DELETE CASCADE
            )`
        );
        await pool.query( // subscription_
            `CREATE TABLE IF NOT EXISTS subscription_(
                id serial PRIMARY KEY,
                consumer_id integer REFERENCES user_(id) ON DELETE SET NULL,
                producer_id integer REFERENCES user_(id) ON DELETE SET NULL,
                discord_mention_server_id integer REFERENCES user_(id) ON DELETE SET NULL,
                domain varchar(10) NOT NULL,
                type varchar(10),
                endpoint varchar(400) NOT NULL,
                whitelisted jsonb NOT NULL,
                timestamp timestamptz NOT NULL
            )`
        );
        await pool.query( // event_
            `CREATE TABLE IF NOT EXISTS event_(
                id serial PRIMARY KEY,
                producer_id integer REFERENCES user_(id) ON DELETE SET NULL,
                game_id integer REFERENCES game_(id) ON DELETE SET NULL,
                category_id integer REFERENCES category_(id) ON DELETE SET NULL,
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
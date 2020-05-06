if (!process.env.NODE_ENV) return console.log('No env specified. Please run "npm run setup-db-{env}"');

const { Pool } = require('pg');

require('dotenv').config({ path: `./env/.env.${process.env.NODE_ENV}` })

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

(async function() {
    console.log('Dropping existing schema...');
    try {
        await pool.query(
            `DROP SCHEMA public CASCADE`
        );
        await pool.query(
            `CREATE SCHEMA public`
        );
        await pool.query(
            `GRANT ALL ON SCHEMA public TO public`
        );
    } catch (e) {
        console.log(e)
    }

    console.log('Creating enums...');
    try {
        await pool.query(
            `CREATE TYPE sub_domain AS ENUM ('discord', 'push')`
        );
        await pool.query(
            `CREATE TYPE discord_sub_type AS ENUM ('server', 'dm', '@')`
        );
    } catch (e) {
        console.log(e);
    }

    console.log('Setting up tables...');
    try {
        await pool.query( // app_user
            `CREATE TABLE IF NOT EXISTS app_user(
                id serial PRIMARY KEY,
                is_consumer boolean NOT NULL,
                is_producer boolean NOT NULL,
                is_discord_server boolean NOT NULL,
                twitch_id varchar(8) UNIQUE,
                twitch_name varchar(32),
                discord_id varchar(24) UNIQUE,
                discord_name varchar(32),
                discord_server_channel_id varchar(24) UNIQUE,
                producer_key varchar(64) UNIQUE
            )`
        );
        await pool.query( // game
            `CREATE TABLE IF NOT EXISTS game(
                id serial PRIMARY KEY,
                title varchar(64) NOT NULL UNIQUE,
                abbreviation varchar(64) NOT NULL UNIQUE,
                original_platform varchar(32)
            )`
        );
        await pool.query( // category
            `CREATE TABLE IF NOT EXISTS category(
                id serial PRIMARY KEY,
                name varchar(64) NOT NULL,
                game_id integer NOT NULL REFERENCES game(id) ON DELETE CASCADE,
                leaderboard_id varchar(32) UNIQUE
            )`
        );
        await pool.query( // feed_category
            `CREATE TABLE IF NOT EXISTS feed_category(
                id serial PRIMARY KEY,
                producer_id integer NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
                category_id integer NOT NULL REFERENCES category(id) ON DELETE CASCADE,
                CONSTRAINT unique_producer_category UNIQUE(producer_id, category_id)
            )`
        );
        await pool.query( // subscription
            `CREATE TABLE IF NOT EXISTS subscription(
                id serial PRIMARY KEY,
                consumer_id integer REFERENCES app_user(id) ON DELETE SET NULL,
                producer_id integer REFERENCES app_user(id) ON DELETE SET NULL,
                discord_mention_server_id integer REFERENCES app_user(id) ON DELETE SET NULL,
                subscription_domain sub_domain NOT NULL,
                discord_subscription_type discord_sub_type,
                endpoint varchar(400),
                created_at timestamptz NOT NULL,
                CONSTRAINT unique_properties_discord_at UNIQUE(consumer_id, producer_id, subscription_domain, discord_subscription_type, discord_mention_server_id)
            )`
        );
        await pool.query( // allowlist_item
            `CREATE TABLE IF NOT EXISTS allowlist_item(
                id serial PRIMARY KEY,
                subscription_id integer NOT NULL REFERENCES subscription(id) ON DELETE SET NULL,
                allow_all boolean NOT NULL,
                game_id integer REFERENCES game(id) ON DELETE SET NULL,
                category_id integer REFERENCES category(id) ON DELETE SET NULL,
                created_at timestamptz NOT NULL,
                CONSTRAINT unique_properties_category UNIQUE(subscription_id, allow_all, game_id, category_id)
            )`
        );
        await pool.query( // event
            `CREATE TABLE IF NOT EXISTS event(
                id serial PRIMARY KEY,
                producer_id integer REFERENCES app_user(id) ON DELETE SET NULL,
                game_id integer REFERENCES game(id) ON DELETE SET NULL,
                category_id integer REFERENCES category(id) ON DELETE SET NULL,
                split_name varchar(64),
                pace varchar(24),
                message text,
                created_at timestamptz NOT NULL
            )`
        );
    } catch (e) {
        console.log(e);
    }

    console.log('Creating indexes...');
    try {
        await pool.query(
            `CREATE UNIQUE INDEX unique_properties_no_discord
            ON subscription (consumer_id, producer_id, subscription_domain)
            WHERE discord_mention_server_id IS NULL
            AND discord_subscription_type IS NULL`
        );
        await pool.query(
            `CREATE UNIQUE INDEX unique_properties_discord
            ON subscription (consumer_id, producer_id, subscription_domain, discord_subscription_type)
            WHERE discord_mention_server_id IS NULL`
        );
        await pool.query(
            `CREATE UNIQUE INDEX unique_properties_game
            ON allowlist_item (subscription_id, allow_all, game_id)
            WHERE category_id IS NULL`
        );
        await pool.query(
            `CREATE UNIQUE INDEX unique_properties_all
            ON allowlist_item (subscription_id, allow_all)
            WHERE game_id IS NULL
            AND category_id IS NULL`
        );
    } catch (e) {
        console.log(e);
    }

    if (process.env.NODE_ENV !== 'prod') {
        console.log('Inserting seed data...')
        try {
            // app_user
            await pool.query(
                `INSERT INTO app_user (is_consumer, is_producer, is_discord_server, twitch_id, twitch_name, discord_id, discord_name, producer_key)
                VALUES (true, true, false, '14930010', 'cyghfer', '153035778883059712', 'cyghfer', '120b5f0a-84c9-41b7-9602-7eb546b80e13')`
            );
            await pool.query(
                `INSERT INTO app_user (is_consumer, is_producer, is_discord_server, twitch_id, twitch_name, discord_id, discord_name)
                VALUES (true, false, false, '36499867', 'bjw', '122874023292960769', 'bjw')`
            );
            await pool.query(
                `INSERT INTO app_user (is_consumer, is_producer, is_discord_server, twitch_id, twitch_name, discord_id, discord_name)
                VALUES (true, false, false, '27501154', 'BossCrab', '160900753156866048', 'BossCrab')`
            );
            await pool.query(
                `INSERT INTO app_user (is_consumer, is_producer, is_discord_server, discord_id, discord_name, discord_server_channel_id)
                VALUES (true, false, true, '636006180199727108', 'Catch The Run testing', '640354413864681490')`
            );
            // game
            await pool.query(
                `INSERT INTO game (title, abbreviation, original_platform)
                VALUES ('Super Mario World', 'smw', 'SNES')`
            );
            await pool.query(
                `INSERT INTO game (title, abbreviation, original_platform)
                VALUES ('Super Mario 64', 'sm64', 'N64')`
            );
            await pool.query(
                `INSERT INTO game (title, abbreviation, original_platform)
                VALUES ('Super Metroid', 'sm', 'SNES')`
            );
            await pool.query(
                `INSERT INTO game (title, abbreviation, original_platform)
                VALUES ('Dragon Quest III', 'dq3', 'SNES')`
            );
            // category
            await pool.query(
                `INSERT INTO category (name, game_id)
                VALUES ('Any%', 1)`
            );
            await pool.query(
                `INSERT INTO category (name, game_id)
                VALUES ('Any% No Cape No Star World', 1)`
            );
            await pool.query(
                `INSERT INTO category (name, game_id)
                VALUES ('0 Star', 2)`
            );
            await pool.query(
                `INSERT INTO category (name, game_id)
                VALUES ('1 Star', 2)`
            );
            await pool.query(
                `INSERT INTO category (name, game_id)
                VALUES ('16 Star', 2)`
            );
            await pool.query(
                `INSERT INTO category (name, game_id)
                VALUES ('70 Star', 2)`
            );
            await pool.query(
                `INSERT INTO category (name, game_id)
                VALUES ('120 Star', 2)`
            );
            await pool.query(
                `INSERT INTO category (name, game_id)
                VALUES ('Any% No Major Glitches', 3)`
            );
            await pool.query(
                `INSERT INTO category (name, game_id, leaderboard_id)
                VALUES ('Any%', 4, 'wk6gzqd1')`
            );
            // feed_category
            await pool.query(
                `INSERT INTO feed_category (producer_id, category_id)
                VALUES (1, 1)`
            );
            await pool.query(
                `INSERT INTO feed_category (producer_id, category_id)
                VALUES (1, 2)`
            );
            await pool.query(
                `INSERT INTO feed_category (producer_id, category_id)
                VALUES (1, 3)`
            );
            await pool.query(
                `INSERT INTO feed_category (producer_id, category_id)
                VALUES (1, 4)`
            );
            await pool.query(
                `INSERT INTO feed_category (producer_id, category_id)
                VALUES (1, 5)`
            );
            await pool.query(
                `INSERT INTO feed_category (producer_id, category_id)
                VALUES (1, 6)`
            );
            await pool.query(
                `INSERT INTO feed_category (producer_id, category_id)
                VALUES (1, 7)`
            );
            await pool.query(
                `INSERT INTO feed_category (producer_id, category_id)
                VALUES (1, 8)`
            );
            // subscription
            await pool.query(
                `INSERT INTO subscription (consumer_id, producer_id, discord_mention_server_id, subscription_domain, endpoint, created_at)
                VALUES (3, 1, NULL, 'push', '{"endpoint":"https://fcm.googleapis.com/fcm/send/fAVzomLE3-U:APA91bFAGE4dc-AtWDd0LRtnSsDv_xlI-B7ok5SHgzHMtYQqL3rLubjrrqV3TQlbq6Pyu8YK7vKtxYC0OGfTuqPsS7o3VRWQc3thr-HXpHkhy-J-t_OSsjlqJ01O_jlU52c8r8RowuQl","expirationTime":null,"keys":{"p256dh":"BH0BT3ZsdAW9JaXGEaS_yBnPogWq1ud8PhyAvrmc7nk4VhJawfjEx0Ofdm1Fr_pJmTiUsTFb2Sl8Ye_xXZ2JfEE","auth":"7161HLruzmQA6My0Ff3lRw"}}', NOW())`
            );
            await pool.query(
                `INSERT INTO subscription (consumer_id, producer_id, discord_mention_server_id, subscription_domain, discord_subscription_type, endpoint, created_at)
                VALUES (4, 1, null, 'discord', 'server', null, NOW())`
            );
            await pool.query(
                `INSERT INTO subscription (consumer_id, producer_id, discord_mention_server_id, subscription_domain, discord_subscription_type, endpoint, created_at)
                VALUES (4, 2, null, 'discord', 'server', null, NOW())`
            );
            await pool.query(
                `INSERT INTO subscription (consumer_id, producer_id, discord_mention_server_id, subscription_domain, discord_subscription_type, endpoint, created_at)
                VALUES (3, 2, 4, 'discord', '@', null, NOW())`
            );
            // allowlist_item
            await pool.query(
                `INSERT INTO allowlist_item (subscription_id, allow_all, game_id, category_id, created_at)
                VALUES (1, false, 1, 1, NOW())`
            );
            await pool.query(
                `INSERT INTO allowlist_item (subscription_id, allow_all, game_id, category_id, created_at)
                VALUES (1, false, 1, 2, NOW())`
            );
            await pool.query(
                `INSERT INTO allowlist_item (subscription_id, allow_all, game_id, category_id, created_at)
                VALUES (1, false, 2, null, NOW())`
            );
            await pool.query(
                `INSERT INTO allowlist_item (subscription_id, allow_all, game_id, category_id, created_at)
                VALUES (2, false, 2, 5, NOW())`
            );
            await pool.query(
                `INSERT INTO allowlist_item (subscription_id, allow_all, game_id, category_id, created_at)
                VALUES (2, false, 2, 6, NOW())`
            );
            await pool.query(
                `INSERT INTO allowlist_item (subscription_id, allow_all, game_id, category_id, created_at)
                VALUES (2, false, 2, 7, NOW())`
            );
            await pool.query(
                `INSERT INTO allowlist_item (subscription_id, allow_all, game_id, category_id, created_at)
                VALUES (2, false, 3, 8, NOW())`
            );
            await pool.query(
                `INSERT INTO allowlist_item (subscription_id, allow_all, game_id, category_id, created_at)
                VALUES (3, true, null, null, NOW())`
            );
        } catch (e) {
            console.log(e);
        }
    }

    console.log('Setup complete.');
})();
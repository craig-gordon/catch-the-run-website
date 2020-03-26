const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

module.exports = {
    query: (text, params) => {
        const start = Date.now();
        const data = pool.query(text, params);
        const duration = Date.now() - start;
        console.log('executed query', { text, duration, rows: res.rowCount })
        return data;
    },
    getClient: (callback) => {
        pool.connect((err, client, done) => {
            const query = client.query;

            client.query = (...args) => {
                client.lastQuery = args;
                return query.apply(client, args);
            };

            const timeout = setTimeout(() => {
                console.error('A client has been checked out for more than 5 seconds!');
                console.error(`The last executed query on this client was: ${client.lastQuery}`);
            }, 5000);
            
            const release = (err) => {
                done(err);
                clearTimeout(timeout);
                client.query = query;
            };

            callback(err, client, release);
        });
    }
}
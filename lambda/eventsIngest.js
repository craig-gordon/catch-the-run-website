const { Pool } = require('pg');
const SNS = require('aws-sdk/clients/sns');

exports.handler = async (event, context) => {
    const acceptedHttpMethods = ['POST'];

    const processResponse = (l, s, b) => {
        console.log(l);
        response = {
            statusCode: s,
            body: b
        };
    }

    const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, SNS_TOPICARN } = process.env;

    const httpMethod = event.requestContext.http.method;
    const { clientid, clientkey } = event.headers;

    let response;

    if (acceptedHttpMethods.includes(httpMethod)) {
        const pool = new Pool({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
            port: DB_PORT,
        });

        let producer_;
        try {
            const dbRes = await pool.query(`SELECT * FROM user_ WHERE twitch_name = $1`, [clientid]);
            producer_ = dbRes.rows[0];
        } catch (err) {
            processResponse(`An error occurred retrieving the Producer record from ${DB_HOST}: ${err}`, '500', `Internal error occurred`);
        }

        if (producer_ !== null) {
            if (producer_.client_key === clientkey) {
                const params = {
                    Message: event.body,
                    TopicArn: SNS_TOPICARN
                };

                let publishRes;
                try {
                    publishRes = await new SNS({apiVersion: '2010-03-31'}).publish(params).promise();
                    processResponse(`Message ${publishRes.MessageId} published to Topic ${SNS_TOPICARN}`, '200', null);
                } catch (err) {
                    processResponse(`An error occurred publishing to SNS Topic ${SNS_TOPICARN}: ${err}`, '500', `Internal error occurred`);
                }
            } else {
                processResponse(`Incorrect clientkey provided for clientid ${clientid}: ${clientkey}`, '403', `Incorrect Client Key`);
            }
        } else {
            processResponse(`clientid ${clientid} was not found`, '403', `Client ID does not exist`);
        }
    } else {
        processResponse(`Unsupported HTTP method specified: ${httpMethod}`, '400', `HTTP method not supported: ${httpMethod}. Accepted HTTP methods: ${acceptedHttpMethods.join(', ')}`);
    }

    return response;
};
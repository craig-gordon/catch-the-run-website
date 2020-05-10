const crypto = require('crypto');
const { createLogger, format, transports } = require('winston');
const { combine, colorize, json, prettyPrint, timestamp, splat, printf } = format;
require('winston-daily-rotate-file');
const WinstonCloudWatch = require('winston-cloudwatch');
const CloudWatchLogs = require('aws-sdk/clients/cloudwatchlogs');

const { NODE_ENV } = process.env;

const startTime = new Date().toISOString();

const logFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${message}`;
});

const logger = new createLogger({
  level: 'debug',
  exitOnError: false,
  format: combine(
    colorize(),
    timestamp({format: 'MM-DD-YYYY H:mm:ss'}),
    prettyPrint(),
    json(),
    splat(),
    logFormat,
  ),
  transports: new (transports.Console)()
});

if (NODE_ENV === 'staging' || NODE_ENV === 'prod') {
  logger.add(
    new (transports.DailyRotateFile)({
      dirname: './logs',
      filename: 'ctr-discord-bot-%DATE%.log',
      maxFiles: '365d'
    })
  );

  logger.add(
    new WinstonCloudWatch({
      cloudWatchLogs: new CloudWatchLogs({
        accessKeyId: process.env.CLOUDWATCH_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDWATCH_SECRET_ACCESS_KEY,
        region: process.env.CLOUDWATCH_REGION
      }),
      logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME,
      logStreamName: () => {
        let date = new Date().toISOString().split('T')[0];
        return 'ctr-discord-bot-' + date + '-' +
          crypto.createHash('md5')
            .update(startTime)
            .digest('hex');
      },
      jsonMessage: true,
      retentionInDays: 365
    })
  );
}

module.exports = logger;
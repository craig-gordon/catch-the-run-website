import logger from './logger.js';

class ApiExecutionContext {
    constructor(req, res, startTime, apiRoute) {
        this.reqHeaders = req.headers;
        this.reqBody = req.body;
        this.reqQuery = req.query;
        this.res = res;
        this.apiRoute = apiRoute;
        this.cmdExecutionStartTime = startTime;
        this.messageCreationTime = req.body.Timestamp;
        this.logger = logger;
    }

    logExecutionContext() {
        const now = Date.now();
        this.elapsedExecutionTime = `${now - this.cmdExecutionStartTime}ms`;
        this.elapsedSinceMessageCreationTime = `${now - new Date(this.messageCreationTime).getTime()}ms`;
        const logObj = Object.assign({}, this);
        delete logObj.cmdExecutionStartTime;
        delete logObj.messageCreationTime;
        delete logObj.logger;
        delete logObj.res;
        this.logger.info('%o', logObj);
    }

    endApiExecution(error, statusCode, responseBody) {
        this.dbClient && this.dbClient.end();
        this.statusCode = statusCode;
        this.responseBody = responseBody;
        error && this.logger.error(error);
        this.logExecutionContext();
        return this.res.status(statusCode).send(responseBody);
    }
};

module.exports = ApiExecutionContext;
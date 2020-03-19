import DynamoDB from 'aws-sdk/clients/dynamodb';

module.exports = async (req, res) => {
    const { ClientID, ClientKey } = req.body;

    const dynamoClient = new DynamoDB.DocumentClient({
        endpoint: 'https://dynamodb.us-east-1.amazonaws.com',
        accessKeyId: 'AKIAYGOXM6CJTCGJ5S5Z',
        secretAccessKey: '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',
        region: 'us-east-1'
    });

    const getProducerParams = {
        TableName: 'Main',
        Key: {
            PRT: ClientID,
            SRT: 'F'
        }
    };

    try {
        const producer = (await dynamoClient.get(getProducerParams).promise()).Item;
        if (producer && producer.GS === ClientKey) res.status(200).send();
        else res.status(400).send();
    } catch (e) {
        res.status(500).send('Error verifying Client Credentials. Please try again later.');
    }
};
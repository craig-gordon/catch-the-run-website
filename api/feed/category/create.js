import DynamoDB from 'aws-sdk/clients/dynamodb';

module.exports = async (req, res) => {
    const { Producer, Game, Category } = req.body;

    const dynamoClient = new DynamoDB.DocumentClient({
        endpoint: 'https://dynamodb.us-east-1.amazonaws.com',
        accessKeyId: 'AKIAYGOXM6CJTCGJ5S5Z',
        secretAccessKey: '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',
        region: 'us-east-1'
    });

    const addFeedCategoryParams = {
        TableName: 'Main',
        Item: {
            PRT: Producer,
            SRT: `F|CAT|${Game}_${Category}`,
            GS: Producer
        }
    };

    try {
        const dbResponse = await dynamoClient.put(addFeedCategoryParams).promise();
        if (!dbResponse.error) res.status(200).send();
        else res.status(500).send('Error adding new Feed Category. Please try again later.');
    } catch (e) {
        res.status(500).send('Error adding new Feed Category. Please try again later.');
    }
};
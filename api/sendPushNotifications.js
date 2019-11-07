import DynamoDB from 'aws-sdk/clients/dynamodb';
import webPush from 'web-push';

webPush.setVapidDetails(
  'https://catchthe.run/',
  'BJMQ-CpMM_-OoO2hNPt3oM_pM8TSpPhSL_rGwGix99iLj0hdyHCZTP3XYeOO8sf9ghhHHFO2I7QpDrgSyGd1VQ4',
  'S_3sQfZvYAh7LGuKkXreV_kfcmAkdNFL0nAoI2z1P3w'
);

module.exports = async (req, res) => { // eslint-disable-line
  const { ProviderName, Game, Category, Message } = req.body;

  const dynamoClient = new DynamoDB.DocumentClient({
    endpoint: 'https://dynamodb.us-east-1.amazonaws.com',
    accessKeyId: 'AKIAYGOXM6CJTCGJ5S5Z',
    secretAccessKey: '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',
    region: 'us-east-1'
  });

  const getAllPushSubsQueryParams = {
    TableName: 'Main',
    KeyConditionExpression: 'PRT = :PRT',
    ExpressionAttributeValues: {
      ':PRT': `${ProviderName}|PUSH`
    }
  };

  try {
    const allPushSubs = (await dynamoClient.query(getAllPushSubsQueryParams).promise()).Items;

    const massPush = await Promise.all(
      allPushSubs.map(async sub => {
        await webPush
          .sendNotification(JSON.parse(sub.slice(6)), Message)
          .then(res => console.log('webpush res:', res))
          .catch(err => console.log('webpush error:', err));
      })
    );

    res.status(200).send(massPush ? true : false)
  } catch (e) {
    console.log('error sending push notifs:', e);
  }
};
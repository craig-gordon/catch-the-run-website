import DynamoDB from 'aws-sdk/clients/dynamodb';
import webPush from 'web-push';

webPush.setVapidDetails(
  'https://catchthe.run/',
  'BJMQ-CpMM_-OoO2hNPt3oM_pM8TSpPhSL_rGwGix99iLj0hdyHCZTP3XYeOO8sf9ghhHHFO2I7QpDrgSyGd1VQ4',
  'S_3sQfZvYAh7LGuKkXreV_kfcmAkdNFL0nAoI2z1P3w'
);

const checkAgainstFilter = (category, filter) => {
  if (filter === undefined) return true;

  const gameTitle = category.slice(0, category.indexOf('_'));

  if (filter.Type === 'B') { // blacklist
    for (const filterGame of filter.Games.values) {
      if (gameTitle === filterGame) return false;
    }

    for (const filterCategory of filter.Categories.values) {
      if (category === filterCategory) return false;
    }

    return true;
  }

  else { // whitelist
    for (const filterGame of filter.Games.values) {
      if (gameTitle === filterGame) return true;
    }

    for (const filterCategory of filter.Categories.values) {
      if (category === filterCategory) return true;
    }

    return false;
  }
};

module.exports = async (req, res) => {
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

    const massPushResults = await Promise.all(
      allPushSubs.map(async sub => (
        checkAgainstFilter(Category, sub.Filter)
          ? await webPush.sendNotification(JSON.parse(sub.SRT.slice(6)), Message)
          : false
      ))
    );

    res.status(200).send(massPushResults ? true : false)
  } catch (e) {
    res.status(500).send('Error sending push notifications:', e);
  }
};
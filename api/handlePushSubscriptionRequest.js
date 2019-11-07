const DynamoDB = require('aws-sdk/clients/dynamodb');

navigator.serviceWorker.register('ServiceWorker.js');

module.exports = async (req, res) => { // eslint-disable-line
  const { ProviderName, Filter } = req.body;

  const dynamoClient = new DynamoDB.DocumentClient({
    endpoint: 'https://dynamodb.us-east-1.amazonaws.com',
    accessKeyId: 'AKIAYGOXM6CJTCGJ5S5Z',
    secretAccessKey: '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',
    region: 'us-east-1'
  });

  try {
    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription()
    console.log('registration:', registration, 'existingSubscription:', existingSubscription);

    if (existingSubscription) return existingSubscription;

    const vapidPublicKey = 'BJMQ-CpMM_-OoO2hNPt3oM_pM8TSpPhSL_rGwGix99iLj0hdyHCZTP3XYeOO8sf9ghhHHFO2I7QpDrgSyGd1VQ4';
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    const stringifiedSub = JSON.stringify(newSubscription)
    console.log('stringified subscription:', stringifiedSub);

    const addPushSubParams = {
      TableName: 'Main',
      Item: {
        PRT: `${ProviderName}|PUSH`,
        SRT: `F|SUB|${stringifiedSub}`,
        G1S: ProviderName,
        Filter
      }
    };

    const addPushSubResponse = await dynamoClient.put(addPushSubParams).promise();

    res.status(200).send(addPushSubResponse ? stringifiedSub : null);
  } catch (e) {
    console.log('error adding push sub:', e);
    res.status(500).send(null);
  }
};

const urlBase64ToUint8Array = base64String => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};
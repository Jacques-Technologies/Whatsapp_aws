const axios = require('axios');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { recipient, content } = event.arguments;

  // Send WhatsApp message
  const url = `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`;
  await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'text',
      text: { body: content }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );

  // Store message in DynamoDB
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  const item = { id, sender: 'me', recipient, content, timestamp };
  await dynamo.put({
    TableName: process.env.MESSAGE_TABLE,
    Item: item
  }).promise();

  return item;
};
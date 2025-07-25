# AWS Backend for WhatsApp GPT Bot

This project provides a reusable backend on AWS using AppSync, DynamoDB, Lambda, and API Gateway (webhook) for a WhatsApp GPT Bot. It supports sending and receiving messages, real-time subscriptions, and data storage.

## File Structure

- `template.yaml`: AWS SAM/CloudFormation template defining resources.
- `src/webhook/`: AWS Lambda for handling WhatsApp webhooks.
  - `app.js`
  - `package.json`
- `src/sendMessage/`: AWS Lambda for sending WhatsApp messages via GraphQL.
  - `app.js`
  - `package.json`
- `schema.graphql`: GraphQL schema for AppSync.
- `resolvers/`: AppSync resolver mapping templates.

## Deployment

1. Install AWS SAM CLI.
2. Run:

```bash
sam deploy \
  --template-file template.yaml \
  --stack-name whatsapp-gpt-bot \
  --parameter-overrides \
    AccessTokenParameter=<YOUR_WHATSAPP_ACCESS_TOKEN> \
    PhoneNumberIdParameter=<YOUR_PHONE_NUMBER_ID> \
    VerifyTokenParameter=<YOUR_VERIFY_TOKEN> \
    AppSyncApiUrlParameter=<The_AppSync_API_URL_from_stack_output> \
    AppSyncApiKeyParameter=<The_AppSync_API_KEY_from_stack_output> \
  --capabilities CAPABILITY_IAM
```

3. After deployment, set your WhatsApp webhook URL to:
```
https://<API_GATEWAY_URL>/Prod/webhook
```
For verification, WhatsApp will send a GET with `hub.challenge`.

4. Use the GraphQL API at the URL and API Key provided in stack outputs to query, mutate, and subscribe.

## WhatsApp Webhook Payload Examples

### Message Received
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "contacts": [
              {
                "profile": { "name": "John Doe" },
                "wa_id": "1234567890"
              }
            ],
            "messages": [
              {
                "from": "1234567890",
                "id": "wamid.ID",
                "timestamp": "1620229022",
                "text": { "body": "Hello" },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

### Read Receipt
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "changes": [
        {
          "value": {
            "statuses": [
              {
                "id": "wamid.ID",
                "status": "read",
                "timestamp": "1620229023",
                "recipient_id": "MY_NUMBER"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

## DynamoDB Schema

- Table: `WhatsAppMessages`
- Primary Key: `id` (String)
- Attributes: `sender` (String), `recipient` (String), `content` (String), `timestamp` (String)

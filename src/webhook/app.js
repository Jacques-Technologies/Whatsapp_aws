const axios = require('axios');

const generateOpenAIResponse = async (message) => {
  try {
    const completion = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Eres un asistente conversacional amable y conciso para WhatsApp.' },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return completion.data.choices[0].message.content.trim();
  } catch (err) {
    console.error('OpenAI Error:', err.response?.data || err.message);
    return 'Lo siento, ocurrió un error procesando tu mensaje. Intenta nuevamente más tarde.';
  }
};

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const body = event.body && (typeof event.body === 'string' ? JSON.parse(event.body) : event.body);

  // Verification
  if (event.httpMethod === 'GET' && params['hub.mode'] === 'subscribe') {
    const verifyToken = params['hub.verify_token'];
    if (verifyToken === process.env.VERIFY_TOKEN) {
      return {
        statusCode: 200,
        body: params['hub.challenge']
      };
    }
    return { statusCode: 403, body: 'Verification failed' };
  }

  // Process incoming message
  if (event.httpMethod === 'POST' && body) {
    try {
      const entry = body.entry[0];
      const value = entry.changes[0].value;
      const wa_id = value.contacts[0].wa_id;
      const message = value.messages && value.messages[0];
      if (message && message.type === 'text') {
        const content = message.text.body;
        const messageId = message.id;

        // Call OpenAI
        const aiResponse = await generateOpenAIResponse(content);

        // Trigger AppSync mutation
        const mutation = `
          mutation ReceiveMessage($sender: String!, $content: String!, $messageId: ID!) {
            receiveMessage(sender: $sender, content: $content, messageId: $messageId) {
              id sender recipient content timestamp
            }
          }
        `;
        const variables = { sender: wa_id, content: aiResponse, messageId };

        await axios.post(
          process.env.APPSYNC_API_URL,
          { query: mutation, variables },
          { headers: { 'x-api-key': process.env.APPSYNC_API_KEY } }
        );
      }
      return { statusCode: 200, body: 'ok' };
    } catch (err) {
      console.error(err);
      return { statusCode: 500, body: 'error' };
    }
  }

  return { statusCode: 400, body: 'Bad Request' };
};

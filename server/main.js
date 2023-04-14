import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import Twilio from 'twilio';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';


console.log(process.env.METEOR_SETTINGS);

// Parse the METEOR_SETTINGS JSON string
const meteorSettings = JSON.parse(process.env.METEOR_SETTINGS);

const TWILIO_ACCOUNT_SID = meteorSettings.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = meteorSettings.TWILIO_AUTH_TOKEN;
const MY_PHONE_NUMBER = meteorSettings.TWILIO_PHONE_NUMBER;
const AMAZON_AFFILIATE_TAG = meteorSettings.AMAZON_AFFILIATE_TAG;

console.log(meteorSettings.TWILIO_ACCOUNT_SID)


const twilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

function sendText(to, body) {
  return twilioClient.messages.create({
    from: MY_PHONE_NUMBER,
    to,
    body
  });
}


async function getChatGPTResponse(prompt) {
  const API_KEY = process.env.OPENAI_API_KEY;

  const response = await fetch('https://api.openai.com/v1/engines/text-davinci-002/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      prompt,
      max_tokens: 150,
      n: 1,
      stop: null,
      temperature: 0.7
    })
  });

  const data = await response.json();
  return data.choices[0].text.trim();
}

async function processMessage(message) {
  const senderPhoneNumber = message.From;
  const text = message.Body;

  // Check if it's the first message
  if (text.toLowerCase().startsWith('impersonate')) {
    const person = text.slice(11).trim();
    // Save the impersonation target in a user's session (or database)
    // ...
    await sendText(senderPhoneNumber, `I'm now impersonating ${person}. You can ask me questions as if I were them.`);
  } else {
    // Get the impersonation target from the user's session (or database)
    // ...
    const prompt = `As ${person}, ${text}`;
    const response = await getChatGPTResponse(prompt);
    await sendText(senderPhoneNumber, response);
  }
}

WebApp.connectHandlers.use(bodyParser.urlencoded({ extended: false }));

WebApp.connectHandlers.use('/sms', async (req, res) => {
  if (req.method === 'POST') {
    const message = {
      From: req.body.From,
      Body: req.body.Body
    };

    processMessage(message).catch(err => {
      console.error('Error processing message:', err);
    });

    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end('<Response></Response>');
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method not allowed');
  }
});

Meteor.startup(() => {
  // Your other Meteor startup code here...
});

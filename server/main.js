import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import Twilio from 'twilio';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';

console.log(Meteor.settings);


const TWILIO_ACCOUNT_SID = Meteor.settings.private.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = Meteor.settings.private.TWILIO_AUTH_TOKEN;
const MY_PHONE_NUMBER = Meteor.settings.private.TWILIO_PHONE_NUMBER;
const AMAZON_AFFILIATE_TAG = Meteor.settings.private.AMAZON_AFFILIATE_TAG;
const OPENAI_API_KEY = Meteor.settings.private.OPENAI_API_KEY;

console.log('TWILIO_ACCOUNT_SID:', TWILIO_ACCOUNT_SID);

const twilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

function sendText(to, body) {
  // Add "whatsapp:" prefix to both sender and receiver phone numbers
  const fromNumber = `whatsapp:${MY_PHONE_NUMBER}`;
  const toNumber = `whatsapp:${to}`;

    console.log(`Sending text from ${MY_PHONE_NUMBER} to ${to}: ${body}`);

  return twilioClient.messages.create({
    from: fromNumber,
    to: toNumber,
    body
  });
}

async function getChatGPTResponse(prompt) {
  const apiResponse = await fetch('https://api.openai.com/v1/engines/text-davinci-002/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      prompt,
      max_tokens: 150,
      n: 1,
      stop: null,
      temperature: 0.7
    })
  });

  const data = await apiResponse.json();
  console.log(data);
  return data;
}

const impersonationTargets = {};

async function processMessage(message) {
  const senderPhoneNumber = message.From;
  const text = message.Body;

  console.log(`Message received from ${senderPhoneNumber}: ${text}`);

  if (text.toLowerCase().startsWith('impersonate')) {
    const person = text.slice(11).trim();
    impersonationTargets[senderPhoneNumber] = person;
    console.log(`Impersonation target for ${senderPhoneNumber}: ${person}`);
    await sendText(senderPhoneNumber, `I'm now impersonating ${person}. You can ask me questions as if I were them.`);
  } else {
    const person = impersonationTargets[senderPhoneNumber] || 'Anonymous';
    console.log(`Impersonation target for ${senderPhoneNumber}: ${person}`);
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

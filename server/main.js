import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import Twilio from 'twilio';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';



Meteor.startup(() => {
  console.log('All environment variables:');
  for (const key in process.env) {
    console.log(`${key}: ${process.env[key]}`);
  }
});
console.log("yeah");
console.log(Meteor.settings);

// Parse the METEOR_SETTINGS JSON string if it's defined
let meteorSettings = {};
if (process.env.METEOR_SETTINGS) {
  try {
    meteorSettings = JSON.parse(process.env.METEOR_SETTINGS);
  } catch (error) {
    console.error('Error parsing METEOR_SETTINGS:', error.message);
  }
}

// Access the OPENAI_API_KEY from the parsed object
const OPENAI_API_KEY = meteorSettings.OPENAI_API_KEY;


console.log('OPENAI_API_KEY:', meteorSettings);

//console.log(process.env.TWILIO_ACCOUNT_SID);

  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const MY_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
  const AMAZON_AFFILIATE_TAG = process.env.AMAZON_AFFILIATE_TAG;
 // const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  //console.log('TWILIO_ACCOUNT_SID:', TWILIO_ACCOUNT_SID);
  //console.log('TWILIO_AUTH_TOKEN:', TWILIO_AUTH_TOKEN);
  //console.log('TWILIO_PHONE_NUMBER:', MY_PHONE_NUMBER);
  //console.log('AMAZON_AFFILIATE_TAG:', AMAZON_AFFILIATE_TAG);
  //console.log('OPENAI_API_KEY:', OPENAI_API_KEY);

  // Your other startup code goes here...



//console.log(meteorSettings.TWILIO_ACCOUNT_SID)


const twilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

//console.log('From:', MY_PHONE_NUMBER);
//console.log('To:', to);

function sendText(to, body) {
  return twilioClient.messages.create({
    from: '+14155238886',
    to:'+33652841736',
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

const impersonationTargets = {};

async function processMessage(message) {
  const senderPhoneNumber = message.From;
  const text = message.Body;

  // Check if it's the first message
  if (text.toLowerCase().startsWith('impersonate')) {
    const person = text.slice(11).trim();
    // Save the impersonation target in a user's session (or database)
    impersonationTargets[senderPhoneNumber] = person;
    await sendText(senderPhoneNumber, `I'm now impersonating ${person}. You can ask me questions as if I were them.`);
  } else {
    // Get the impersonation target from the user's session (or database)
    const person = impersonationTargets[senderPhoneNumber] || 'Anonymous';
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

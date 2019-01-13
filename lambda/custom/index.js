const Alexa = require('ask-sdk-core');
const https = require('https');
const constants = require('./constants');

// ToDO: Help Message noch ändern -> erstellen, löschen..
// ToDO: FACTS löschen

const deData = {
  translation: {
    SKILL_NAME: 'Service Now',
    WELCOME_MESSAGE = 'Willkommen im Service Now Skill. Was kann ich für Sie tun?',
    REPROMT_MESSAGE = 'Wie kann ich Ihnen helfen?',
    HELP_MESSAGE: 'Sie können sich verschiedene Tickets, wie beispielsweise Incidents, Changes und weitere ausgeben lassen. Sagen Sie einfach, „Gebe mir ein Incident aus.“',
    FALLBACK_MESSAGE: 'Der Service Now Skill kann dir dabei leider nicht helfen.',
    ERROR_MESSAGE: 'Das Kommando habe ich leider nicht erkannt. Probieren Sie es bitte erneut.',
    CLOSE_MESSAGE: 'Auf Wiedersehen!',
    AUTHENTIFICATION_FAILED_MESSAGE: 'Die Authentifizierung ist fehlgeschlagen.',
    FACTS:
      [
        'Ein Jahr dauert auf dem Merkur nur 88 Tage.',
        'Die Venus ist zwar weiter von der Sonne entfernt, hat aber höhere Temperaturen als Merkur.',
        'Venus dreht sich entgegen dem Uhrzeigersinn, möglicherweise aufgrund eines früheren Zusammenstoßes mit einem Asteroiden.',
        'Auf dem Mars erscheint die Sonne nur halb so groß wie auf der Erde.',
        'Jupiter hat den kürzesten Tag aller Planeten.',
      ],
  },
};


var accessToken = "";

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    accessToken = handlerInput.requestEnvelope.session.user.accessToken;
    
    return handlerInput.responseBuilder
      .speak(deData.WELCOME_MESSAGE)
      .reprompt(deData.REPROMT_MESSAGE)
      .getResponse();
  },
};

const GetTicktetsIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetTicktetsIntent';
  },
  async handle(handlerInput) {
    
    if (!accessToken) {
      return handlerInput.responseBuilder
        .speak(deData.AUTHENTIFICATION_FAILED_MESSAGE)
        .withLinkAccountCard() //??
        .getResponse();
    }
    else {
      const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
      const ticketType = filledSlots.Tickets.value;
      let snowTable = '';
      // get table names from service now: System Definition > Tables
      if (ticketType.indexOf('incident') == 0) {
        snowTable = 'incident';
      }
      else if (ticketType.indexOf('change') == 0) {
        snowTable = 'change_request';
      }
      else if (ticketType.indexOf('request') == 0) {
        snowTable = 'sc_req_item';
      }
      else if (ticketType.indexOf('problem') == 0) {
        snowTable = 'problem';
      }
      else if (ticketType.indexOf('approval') == 0) {
        snowTable = 'sysapproval_approver';
      }

      const records = await getRecords(snowTable);       // Get the records

      let speechText =  "Die letzten 5 " + ticketType + " lauten:";
      for (let i = 0; i < 5; i++) {
          speechText += "Ticket " + (i+1) + '<break time=".5s"/>' + records.result[i].short_description + ". ";
        }

      return handlerInput.responseBuilder
          .speak(speechText)
          .getResponse();
        
    }
  }
};

function getRecords(recType) {
  const hdrAuth = "Bearer " + accessToken; //??

  return new Promise(((resolve, reject) => { //??
    const snowInstance = constants.servicenow.instance;

    const options = {
      hostname: snowInstance,
      port: 443,
      path: '/api/now/table/' + recType + '?sysparm_query=ORDERBYDESCsys_updated_on&sysparm_limit=5',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: hdrAuth
      }
    };

    const request = https.request(options, (response) => {
      response.setEncoding('utf8');
      let returnData = '';

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return reject(new Error(`${response.statusCode}: ${response.req.getHeader('host')} ${response.req.path}`));
        //To Do
      }

      response.on('data', (chunk) => {
        returnData += chunk;
      });

      response.on('end', () => {
        resolve(JSON.parse(returnData)); //??
      });

      response.on('error', (error) => {
        reject(error); //??
        //ToDo
        //response({ 'errorType': 'error', 'errorText': 'Leider trat ein Fehler auf und es konnten keine Daten abgerufen werden. Bitte kontaktieren Sie Ihren Systemadministrator. Vielen Dank.' });

      });   
    });
    request.end();
  }));
}


const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(deData.HELP_MESSAGE)
      .reprompt(deData.REPROMT_MESSAGE)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(deData.CLOSE_MESSAGE)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(deData.CLOSE_MESSAGE)
      .getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak(deData.ERROR_MESSAGE)
      .reprompt(deData.ERROR_MESSAGE)
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    GetTicktetsIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();

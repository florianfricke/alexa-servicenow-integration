const Alexa = require('ask-sdk-core');
const https = require('https');
const constants = require('./constants');
const language = require('./language');

// ToDO: Help Message noch ändern -> erstellen, löschen..
// ToDO: FACTS löschen

var accessToken = "";

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    accessToken = handlerInput.requestEnvelope.session.user.accessToken;
    
    return handlerInput.responseBuilder
      .speak(language.deData.translation.WELCOME_MESSAGE)
      .reprompt(language.deData.translation.REPROMT_MESSAGE)
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
        .speak(language.deData.translation.AUTHENTIFICATION_FAILED_MESSAGE)
    }
    else {
      const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
      const ticketType = filledSlots.Tickets.value;
      let ticketNumbers = filledSlots.Ticketnumbers.value;
      let timespan = filledSlots.Timespan.value;

      console.log("Timespan: " + timespan);
      console.log("ticketNumbers: " + ticketNumbers);


      if (typeof ticketNumbers === 'undefined' || ticketNumbers === '?') {
        ticketNumbers = 1;
      }

      if (typeof timespan === 'undefined') {
        timespan = 'letzten';
      }
      console.log("Timespan after: " + timespan);
      console.log("ticketNumbers after: " + ticketNumbers);
      
      let serviceNowTable = '';
      // get table names from service now: System Definition > Tables
      if (ticketType.indexOf('incident') == 0) {
        serviceNowTable = 'incident';
      }
      else if (ticketType.indexOf('change') == 0) {
        serviceNowTable = 'change_request';
      }
      else if (ticketType.indexOf('problem') == 0) {
        serviceNowTable = 'problem';
      }

      const records = await getRecords(serviceNowTable, ticketNumbers, timespan);       // Get the records

      let speechText;
      if (ticketNumbers === 1) {
        if (timespan === 'letzten') {
          timespan = 'letzte';
        }
        else if (timespan === 'ältesten') {
          timespan = 'älteste';
        }
        speechText = 'Das ' + timespan + ' ' + ticketType + ' Ticket lautet: <break time=".5s" />' + records.result[0].short_description + '. ';
      } else {
        speechText = 'Die ' + timespan + ' ' + + ticketNumbers + ' ' + ticketType + ' lauten: <break time=".5s" />';
        for (let i = 0; i < ticketNumbers; i++) {
          speechText += "Ticket " + (i + 1) + '<break time=".5s"/>' + records.result[i].short_description + ". ";
        }
      }
      speechText += "Was kann ich noch für Sie tun?";

      return handlerInput.responseBuilder
          .speak(speechText)
          .withShouldEndSession(false)
          .getResponse();
    }
  }
};

function getRecords(recType, ticketNumbers, timespan) {
  const hdrAuth = "Bearer " + accessToken; //??
  let sort = 'DESC';

  if (timespan === "ältesten" || timespan === "älteste" || timespan === "spätesten" || timespan === "spätesteste") {
    sort = 'ASC';
  }
  console.log("Sortierung: ", sort);

  return new Promise(((resolve, reject) => { //??
    const serviceNowInstance = constants.servicenow.instance;

    const options = {
      hostname: serviceNowInstance,
      port: 443,
      path: '/api/now/table/' + recType + '?sysparm_query=ORDERBY'+ sort +'sys_updated_on&sysparm_limit=' + ticketNumbers,
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
        console.log(JSON.parse(returnData));
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
      .speak(language.deData.translation.HELP_MESSAGE)
      .reprompt(language.deData.translation.REPROMT_MESSAGE)
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
      .speak(language.deData.translation.CLOSE_MESSAGE)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(language.deData.translation.CLOSE_MESSAGE)
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
      .speak(language.deData.translation.ERROR_MESSAGE)
      .reprompt(language.deData.translation.ERROR_MESSAGE)
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

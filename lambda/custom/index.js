const Alexa = require('ask-sdk-core');
const language = require('./language');
const GetTicktetsIntent = require('./getTicktetsIntentHandler');
const RemoveTicketIntent = require('./removeTicketIntentHandler');
const CreateTicktetsIntent = require('./createTicketsIntentHandler');

let accessToken = "";

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    accessToken = handlerInput.requestEnvelope.session.user.accessToken;

    if (!accessToken) {
      return handlerInput.responseBuilder
        .speak(language.deData.translation.AUTHENTIFICATION_FAILED_MESSAGE)
        .speak(language.deData.translation.CLOSE_MESSAGE)
        .withShouldEndSession(true);
    }
    
    return handlerInput.responseBuilder
      .speak(language.deData.translation.WELCOME_MESSAGE)
      .reprompt(language.deData.translation.REPROMT_MESSAGE)
      .getResponse();
  },
};

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
    GetTicktetsIntent.GetTicktetsIntentHandler,
    RemoveTicketIntent.RemoveTicktetsIntentHandler,
    CreateTicktetsIntent.CreateTicketsIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();

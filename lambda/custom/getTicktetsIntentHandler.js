const constants = require('./constants');
const https = require('https');

let accessToken = "";

exports.GetTicktetsIntentHandler = {
    canHandle(handlerInput) {
        accessToken = handlerInput.requestEnvelope.session.user.accessToken;

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

            if (typeof ticketNumbers === 'undefined' || ticketNumbers === '?') {
                ticketNumbers = 1;
            }

            if (typeof timespan === 'undefined') {
                timespan = 'letzten';
            }

            let serviceNowTable = '';
            if (ticketType.indexOf('incident') == 0) {
                serviceNowTable = 'incident';
            }
            else if (ticketType.indexOf('change') == 0) {
                serviceNowTable = 'change_request';
            }
            else if (ticketType.indexOf('problem') == 0) {
                serviceNowTable = 'problem';
            }

            const records = await getRecords(serviceNowTable, ticketNumbers, timespan);

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
                speechText = 'Die ' + timespan + ' ' + ticketNumbers + ' ' + ticketType + ' lauten: <break time=".5s" />';
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
    const hdrAuth = "Bearer " + accessToken;
    let sort = 'DESC';

    if (timespan === "ältesten" || timespan === "älteste" || timespan === "spätesten" || timespan === "spätesteste") {
        sort = 'ASC';
    }

    return new Promise(((resolve, reject) => {
        const serviceNowInstance = constants.servicenow.instance;

        const options = {
            hostname: serviceNowInstance,
            port: 443,
            path: '/api/now/table/' + recType + '?sysparm_query=ORDERBY' + sort + 'sys_updated_on&sysparm_limit=' + ticketNumbers,
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
            }

            response.on('data', (chunk) => {
                returnData += chunk;
            });

            response.on('end', () => {
                resolve(JSON.parse(returnData));
            });

            response.on('error', (error) => {
                reject(error);
            });
        });
        request.end();
    }));
}
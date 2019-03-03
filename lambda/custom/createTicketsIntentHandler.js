const constants = require('./constants');
const https = require('https');

let accessToken = "";

exports.CreateTicketsIntentHandler = {
    canHandle(handlerInput) {
        accessToken = handlerInput.requestEnvelope.session.user.accessToken;
        return handlerInput.requestEnvelope.request.type == 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name == 'CreateTicketsIntent';
    },
    async handle(handlerInput) {

        if (!accessToken) {
            return handlerInput.responseBuilder
                .speak(language.deData.translation.AUTHENTIFICATION_FAILED_MESSAGE)
        }
        else {
            const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
            const ticketType = filledSlots.Tickets.value;
            const userName = filledSlots.Nutzername.value;
            const shortDescription = filledSlots.Kurzbeschreibung.value;

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
            else {
                serviceNowTable = 'incident';
            }

            await setRecords(serviceNowTable, userName, shortDescription);
            
            let speechText;
            speechText = 'Das ' + ticketType + ' Ticket wurde angelegt.';
            speechText += '<break time=".5s" /> Was kann ich noch für Sie tun?';

            return handlerInput.responseBuilder
                .speak(speechText)
                .withShouldEndSession(false)
                .getResponse();
        }
    }
};

function setRecords(recType, userName, shortDescription) {
    const hdrAuth = "Bearer " + accessToken;

    return new Promise(((resolve, reject) => {
        const serviceNowInstance = constants.servicenow.instance;
        let data = null;
        if (recType == "problem")
            data = {
                opened_by: userName,
                short_description: shortDescription,
            };
        else if (recType == "incident")
            data = {
                caller_id: userName,
                short_description: shortDescription,
            };
        else if (recType == "change_request")
            data = {
                requested_by: userName,
                short_description: shortDescription,
            };
        data = JSON.stringify(data)

        const options = {
            hostname: serviceNowInstance,
            port: 443,
            path: '/api/now/table/' + recType,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: hdrAuth
            }
        };

        const request = https.request(options, (response) => {
            response.setEncoding('utf8');

            if (response.statusCode < 200 || response.statusCode >= 300) {
                return reject(new Error(`${response.statusCode}: ${response.req.getHeader('host')} ${response.req.path}`));
            }

            response.on('data', (d) => {
                resolve(process.stdout.write(d));
            });

            response.on('error', (error) => {
                reject(error);
            });
        });
        request.write(data);
        request.end();
    }));
}
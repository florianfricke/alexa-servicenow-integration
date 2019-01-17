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

            const records = await setRecords(serviceNowTable);
            
            let speechText;
            speechText = 'Das ' + ticketType + ' Ticket mit der Nummer '+ records.result[0].number + 'wurde angelegt.';
            speechText += "Was kann ich noch für Sie tun?";

            return handlerInput.responseBuilder
                .speak(speechText)
                .withShouldEndSession(false)
                .getResponse();
        }
    }
};

function setRecords(recType) {
    const hdrAuth = "Bearer " + accessToken; //??

    return new Promise(((resolve, reject) => { //??
        const serviceNowInstance = constants.servicenow.instance;

        const data = JSON.stringify({
            caller_id: 'Abel Tuter',
            short_description: 'Der Bildschirm funktioniert nicht!',
        });

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
                process.stdout.write(d);
            });

            response.on('end', () => {
                resolve(JSON.parse(returnData)); //??
                console.log("service now json: " + JSON.parse(returnData));
            });

            response.on('error', (error) => {
                reject(error); //??
                //ToDo
                //response({ 'errorType': 'error', 'errorText': 'Leider trat ein Fehler auf und es konnten keine Daten abgerufen werden. Bitte kontaktieren Sie Ihren Systemadministrator. Vielen Dank.' });

            });
        });
        console.log("Before write");
        request.write(data);
        console.log("After write");
        request.end();
        console.log("After End");
    }));
}
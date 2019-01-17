const constants = require('./constants');
const https = require('https');

let accessToken = "";

exports.RemoveTicktetsIntentHandler = {
    canHandle(handlerInput) {
        accessToken = handlerInput.requestEnvelope.session.user.accessToken;

        return handlerInput.requestEnvelope.request.type == 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name == 'RemoveTicktetsIntent';
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


            if (typeof ticketNumbers == 'undefined' || ticketNumbers == '?') {
                ticketNumbers = 1;
            }

            if (typeof timespan == 'undefined') {
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
            if (ticketNumbers == 1) {
                console.log("Sys_ID: " + records.result[0].sys_id);
                await setRecordComplete(serviceNowTable, records.result[0].sys_id);
            } else {
                for (let i = 0; i < ticketNumbers; i++) {
                    console.log("Sys_ID2: " + records.result[i].sys_id);
                    await setRecordComplete(serviceNowTable, records.result[i].sys_id);
                }
            }
            speechText += "Die gewählten Tickets wurden auf Complete gesetzt. Was kann ich noch für Sie tun?";

            return handlerInput.responseBuilder
                .speak(speechText)
                .withShouldEndSession(false)
                .getResponse();
        }
    }
};

// function setRecordComplete(sys_id) 
// {
//     var requestBody = "{\"state\":\"7\"}"; 

//     var client=new XMLHttpRequest();
//     client.open("put","https://dev71109.service-now.com/api/now/table/incident/" + sys_id);

//     client.setRequestHeader('Accept','application/json');
//     client.setRequestHeader('Content-Type','application/json');

//     //Eg. UserName="admin", Password="admin" for this code sample.
//     client.setRequestHeader('Authorization', 'Basic '+btoa('admin'+':'+'admin'));

//     client.onreadystatechange = function() { 
//         if(this.readyState == this.DONE) {
//             document.getElementById("response").innerHTML=this.status + this.response; 
//         }
//     }; 
//     client.send(requestBody);
// };

function setRecordComplete(recType, sys_id) {
    const hdrAuth = "Bearer " + accessToken; //??
    
    return new Promise(((resolve, reject) => { //??
        const serviceNowInstance = constants.servicenow.instance;
        
        const data = JSON.stringify({
            state: '7'
        });

        console.log("Sys_ID3: " + sys_id)
        
        const options = {
            hostname: serviceNowInstance,
            port: 443,
            path: '/api/now/table/' + recType + "/" + sys_id,
            method: 'PUT',
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

            response.on('data', (d) => {
                process.stdout.write(d);
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
        request.write(data)
        request.end();
    }));
}


function getRecords(recType, ticketNumbers, timespan) {
    const hdrAuth = "Bearer " + accessToken; //??
    let sort = 'DESC';

    if (timespan == "ältesten" || timespan == "älteste" || timespan == "spätesten" || timespan == "spätesteste") {
        sort = 'ASC';
    }
    console.log("Sortierung: ", sort);

    return new Promise(((resolve, reject) => { //??
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
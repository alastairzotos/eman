const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const APIENDPOINT = "http://scottishpower.e.alterian.net/EM.svc/";


export interface IAlterianRequest {
    endpoint: string;
    payload: any;
}

export const callAPI = (request: IAlterianRequest): Promise<any> => {

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        if (!xhr) {
            reject("Failed to create XML Http request!");
            return;
        }

        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(JSON.parse(xhr.responseText));
                }
            }
        };

        xhr.open("POST", APIENDPOINT + request.endpoint, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(request.payload));
    });
};
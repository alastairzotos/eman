"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var APIENDPOINT = "http://scottishpower.e.alterian.net/EM.svc/";
exports.callAPI = function (request) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        if (!xhr) {
            reject("Failed to create XML Http request!");
            return;
        }
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    resolve(JSON.parse(xhr.responseText));
                }
                else {
                    reject(JSON.parse(xhr.responseText));
                }
            }
        };
        xhr.open("POST", APIENDPOINT + request.endpoint, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(request.payload));
    });
};
//# sourceMappingURL=core.js.map
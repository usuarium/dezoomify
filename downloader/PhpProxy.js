"use strict";

export default class PhpProxy
{
    constructor(proxy) {
        this.cookies = ''
        this.proxyUrl = proxy || 'proxy.php'
        
        this.entityDecoderDict = {
            "&amp;": "&",
            "&lt;": "<",
            "&gt;": ">",
            "&quot;": "\""
        }
        this.entityDecoderRegex = /&(?:amp|lt|gt|quot|#(?:x[\da-f]+|\d+));/gi;
    }
    
    async getFile(url, params) {
        let type = params.type || 'text';
        let xhr = new XMLHttpRequest();

        // The url we got MIGHT already have been encoded
        // The url we give to the server MUST be encoded
        if (url.match(/%[a-zA-Z0-9]{2}/) === null) {
            url = encodeURI(url);
        }
        // We pass the URL itself as a query parameter, so we have to re-encode it
        let codedurl = encodeURIComponent(url);
        let requestUrl = `${this.proxyUrl}?url=${codedurl}`;

        if (this.cookies.length > 0) {
            requestUrl += `${requestUrl}&cookies=${encodeURIComponent(this.cookies)}`;
        }

        xhr.open('GET', requestUrl, true);
        // xhr.onloadstart = function () {
        //     ZoomManager.updateProgress(1, "Sent a request in order to get information about the image...");
        // };

        let that = this
        return new Promise((resolve, reject) => {
            xhr.onerror = () => reject(xhr.statusText);
            xhr.onloadend = function () {
                let response = xhr.response;
                let cookie = xhr.getResponseHeader("X-Set-Cookie");
                if (cookie) {
                    that.cookies += cookie;
                }
                
                // Custom error message on invalid XML
                if (type === 'xml' && response.documentElement.tagName === 'parsererror') {
                    reject(`Invalid XML:\n${url}`);
                }
                // Custom error message on invalid JSON
                if (type === "json" && xhr.response === null) {
                    reject(`Invalid JSON:\n${url}`);
                }
                // Decode html encoded entities
                if (type === 'htmltext') {
                    response = that.decodeHTMLentities(response);
                }
                resolve(response, xhr);
            };
            
            switch(type) {
                case "xml":
                    xhr.responseType = "document";
                    xhr.overrideMimeType("text/xml");
                    break;
                case "json":
                    xhr.responseType = "json";
                    xhr.overrideMimeType("application/json");
                    break;
                default:
                    xhr.responseType = "text";
                    xhr.overrideMimeType("text/plain");
            }
            
            xhr.send(null);
        })
    }
    
    /**
     * Decode HTML special characaters such as "&amp;", "&gt;", ...
     * 
     * @function ZoomManager.decodeHTMLentities
     * @param {string} str
     * @return {string} decoded
     */
    decodeHTMLentities(text) {
        let dict = this.entityDecoderDict
        return text.replace(this.entityDecoderRegex, (entity) => {
            entity = entity.toLowerCase();
            return dict[entity] || String.fromCharCode(parseInt('0' + entity.slice(2,-1)));
        })
    }
}
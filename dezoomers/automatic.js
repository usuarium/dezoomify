"use strict";

import ZoomManager from "../ZoomManager.js"

export default class Automatic
{
    constructor() {
        this.name = 'Select automatically'
        this.description = 'Tries to guess which dezoomer to use by selectioning among known url patterns'
    }
    
    async open(url) {
        // Find dezoomer to the one that that will most probably
        // be able to dezoom url, and call the callback with it

        // First, try to match the URL
        for (let dezoomer of ZoomManager.dezoomersList) {
            if (dezoomer.urls === undefined || dezoomer.urls.length == 0) {
                continue
            }
            
            
            for (let urlRegex of dezoomer.urls) {
                if (url.match(urlRegex)) {
                    ZoomManager.setDezoomer(dezoomer);
                    return ZoomManager.open(url);
                }
            }
        }

		// Then, if url didn't match, try to match the contents
		// Match recursively the page contents and all its iframe children
        let urlstack = [url]
        for (let nextUrl of urlstack) {
            let relativeNextUrl = ZoomManager.resolveRelative(nextUrl, url);
            
            let contents = await ZoomManager.getFile(relativeNextUrl, {type:"htmltext"})
            
            var iframeRegex = /<i?frame[^>]*src=["']([^"']+)/g;
            var match;
            while (match = iframeRegex.exec(contents)) {
                urlstack.push(match[1]);
            }

            for (let dezoomer of ZoomManager.dezoomersList) {
                if (!dezoomer.contents) {
                    continue;
                }

                ZoomManager.setDezoomer(dezoomer);

                for (let contentRegexp of dezoomer.contents) {
                    if (contents.match(contentRegexp)) {
                        return await ZoomManager.open(relativeNextUrl);
                    }
                }
            }
        }

        var msg = "Unable to find a proper dezoomer for:\n" + url;
        throw new Error(msg);
    }
}


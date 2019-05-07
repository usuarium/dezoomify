"use strict";

import ZoomManager from "../ZoomManager.js"

export default class Zoomify
{
    constructor() {
        this.name = 'Zoomify'
        this.description = 'Most commmon zoomable image format'
        this.urls = [
            /ImageProperties\.xml$/,
            /biblio\.unibe\.ch\/web-apps\/maps\/zoomify\.php/,
            /bspe-p-pub\.paris\.fr\/MDBGED\/zoomify-BFS\.aspx/,
            /ngv\.vic\.gov\.au\/explore\/collection\/work/,
            /artandarchitecture\.org\.uk\/images\/zoom/
        ]
        
        this.contents = [
            /zoomifyImagePath=/,
            /showImage\(/,
            /accessnumber=/,
            /ete-openlayers-src/
        ]
    }
    
    async findFile(baseUrl) {
        if (baseUrl.match(/ImageProperties\.xml$/)) {
            return baseUrl;
        }
        
        let response = await ZoomManager.getFile(baseUrl, {type:"htmltext"})
        let matchPath = text.match(
            /zoomifyImagePath=([^\'"&]*)[\'"&]|showImage\([^),]*,\s*["']([^'"]*)/
        );
        if (matchPath) {
            for (var i = 1; i < matchPath.length; i++) {
                if (matchPath[i]) {
                    return `${matchPath[i]}/ImageProperties.xml`
                }
            }
        }
        // Fluid engage zoomify
        let fluidMatch = text.match(/accessnumber=([^"&\s']+)/i);
        if (fluidMatch) {
            let xmlBrokerPath = `/scripts/XMLBroker.new.php?Lang=2&contentType=IMAGES&contentID=${fluidMatch[1]}`
            let url = ZoomManager.resolveRelative(xmlBrokerPath, baseUrl)
            
            let xmlResponse = await ZoomManager.getFile(url, {type:"xml"})
            let pathElem = xmlResponse.querySelector("imagefile[format=zoomify]")
            
            return `${pathElem.firstChild.nodeValue}/ImageProperties.xml`
        }
        
        // Universitätsbibliothek
        let unibeMatch = text.match(/url = '([^']*)'/);
        if (~baseUrl.indexOf('biblio.unibe.ch/web-apps/maps/zoomify.php') && unibeMatch) {
            let url = ZoomManager.resolveRelative(unibeMatch[1], baseUrl);
            return `${url}/ImageProperties.xml`
        }

        // Openlayers
        let olMatch = text.match(/<[^>]*class="ete-openlayers-src"[^>]*>(.*?)<\/.*>/);
        if (olMatch) {
            return `${olMatch[1]}/ImageProperties.xml`
        }

        // National Gallery of Victoria (NGV)
        var ngvMatch = text.match(/var url = '(.*?)'/);
        if (~baseUrl.indexOf("ngv.vic.gov.au") && ngvMatch) {
            return `${ngvMatch[1]}/ImageProperties.xml`
        }

        // If nothing was found, but the page contains an iframe, follow the iframe
        let iframeMatch = text.match(/<iframe[^>]*src=["']([^"']*)/)
        if (iframeMatch) {
            var url = ZoomManager.resolveRelative(iframeMatch[1], baseUrl)
            
            return this.findFileAsync(url)
        }

        // If no zoomify path was found in the page, then assume that
        // the url that was given is the path itself
        return `${baseUrl}/ImageProperties.xml`;
    }
    
    async open(url) {
        let xml = await ZoomManager.getFile(baseUrl, {type:"htmltext"})
        var infos = xml.getElementsByTagName('IMAGE_PROPERTIES')[0];
        if (!infos) {
            throw new Error(`Invalid zoomify XML info file: ${url}`)
        }
        
        var data = {};
        data.origin = url;
        data.width = parseInt(infos.getAttribute("WIDTH"));
        data.height = parseInt(infos.getAttribute("HEIGHT"));
        data.tileSize = parseInt(infos.getAttribute("TILESIZE"));
        data.numTiles = parseInt(infos.getAttribute("NUMTILES")); //Total number of tiles (for all zoom levels)
        data.zoomFactor = 2; //Zooming factor between two consecutive zoom levels

        var w = data.width, h = data.height,
            ntiles = 0,
            maxZoom = ZoomManager.findMaxZoom(data);

        for (var z=0; z<=maxZoom; z++) {
            ntiles += Math.ceil(w / data.tileSize) * Math.ceil(h / data.tileSize);
            w /= 2; h /= 2;
        }
        if (ntiles !== data.numTiles) {
            // The computed zoom level was incorrect.
            // When zoomify generates the zoom levels, it MAY stop creating new zoom
            // levels when a zoomlevel has one of its dimensions that rounds down to TILESIZE.
            var size = Math.max(data.width, data.height);
            data.maxZoomLevel = Math.ceil(Math.log(size/(data.tileSize+1)) / Math.LN2);
        }
        
        return data
    }
    getTileURL(col, row, zoom, data) {
        var totalTiles = data.nbrTilesX * data.nbrTilesY;
        var tileGroup = Math.floor((data.numTiles - totalTiles + col + row*data.nbrTilesX) / 256);
        return `TileGroup${tileGroup}/${zoom}-${col}-${row}.jpg`;
    }
}



"use strict";

import ZoomManager from "../ZoomManager.js"

export default class Seadragon
{
    constructor() {
        this.name = 'Seadragon (Deep Zoom Image)'
        this.description = 'Microsoft zoomable image format, sometimes called DZI, seadragon, or deep zoom'
        this.urls = [
            /bl\.uk\/manuscripts\/Viewer\.aspx/,
            /polona\.pl\/item\//,
            /bibliotheques-specialisees\.paris\.fr\/ark/,
            /nla\.gov\.au\/nla\.obj.*\/view$/,
            /_files\/\d+\/\d+_\d+.jpg$/,
            /dzi$/
        ]
        
        this.contents = [
            /dziUrlTemplate/,
            /[^"'()<>]+\.(?:dzi)/i,
            /schemas\.microsoft\.com\/deepzoom/,
            /zoom(?:\.it|hub.net)\/.*\.js/,
            /\b(dzi|DZI)\b/
        ]
    }
    
    async findFile(baseUrl) {
        if (baseUrl.match(/\.xml|\.dzi/i)) {
            return baseUrl
        }

        // British Library
        if (baseUrl.indexOf("bl.uk/manuscripts/Viewer.aspx") > -1) {
            return baseUrl.replace("Viewer.aspx","Proxy.ashx").replace(/ref=([^&]*)/, "view=$1.xml")
        }

        // Polona.pl
        var polonaMatch = baseUrl.match(/polona.pl\/item\/(\d+)\/(\d+)/);
        if (polonaMatch) {
            var itemId = polonaMatch[1], pageId = parseInt(polonaMatch[2])
            var resUrl = `http://polona.pl/resources/item/${itemId}/?format=json`
            
            let res = await ZoomManager.getFile(resUrl, {type:"json"})
            
            return res.pages[pageId].dzi_url
        }

        // national library of australia
        if (baseUrl.match(/nla\.gov\.au\/nla\.obj.*\/view$/)) {
            return baseUrl.replace(/view\/?$/, "dzi")
        }
        
        // A single tile URL
        var tileMatch = baseUrl.match(/(.*)_files\/\d+\/\d+_\d+.jpg$/);
        if (tileMatch) {
            return callback(tileMatch[1] + ".dzi");
        }
        
        let bodleianMatch = baseUrl.match(/digital\.bodleian\.ox\.ac\.uk/)
        if (bodleianMatch) {
            bodleianMatch = baseUrl.match(/vi\+([^,]+)/)
            let url = `https://digital.bodleian.ox.ac.uk/inquire/Discover/GetRecordAjax?id=${bodleianMatch[1]}`
            return url
        }

        let text = await ZoomManager.getFile(baseUrl, {type:"htmltext"})
        
        // World digital library
        var wdlMatch = baseUrl.match(/view\/(\d+)\/(\d+)/);
        if (wdlMatch && text.match("dziUrlTemplate")) {
            var group = parseInt(wdlMatch[1]);
            var index = parseInt(wdlMatch[2]);
            var m = text.match(/"([^"]+\.dzi)"/i);
            var url = m[1].replace("{group}", group).replace("{index}", index);
            return url;
        }

        // Zoom.it
        var zoomitMatch = text.match(/zoom(?:\.it|hub.net)\/(.*?)\.js/);
        if (zoomitMatch) {
            return `http://content.zoomhub.net/dzis/${zoomitMatch[1]}.dzi`
        }

        // bibliothèques specialisées de la ville de Paris
        var parisMatch = text.match(/deepZoomManifest['"]\s*:\s*["']([^"']*)/)
        if (parisMatch) {
            return parisMatch[1]
        }

        // Any url ending with .xml or .dzi
        var matchPath = text.match(/[^"'()<>]+\.(?:xml|dzi)/i)
        if (matchPath) {
            return matchPath[0]
        }

        // Try to find a link to a dzi file, (<dzi>link</dzi>, "dzi": "link", dzi="link")
        var dziLinkMatch = text.match(/[^a-z]dzi["'<>\s:=]+([^<"']*)/i)
        if (dziLinkMatch) {
            return dziLinkMatch[1]
        }
        
        return baseUrl
    }
    
    async open(url) {
        var data = {}

        if (url.match(/digital\.bodleian\.ox\.ac\.uk/)) {
            let json = await ZoomManager.getFile(url, {type:"json"})
            data.origin = `https://digital.bodleian.ox.ac.uk/inquire/viewer.dzi?DeepZoom=${json.SearchResults.Results[0].File}_files/`

            data.tileSize = 256;
            data.format = 'jpg';

            data.width = json.SearchResults.Results[0].ImageMetadata.Width;
            data.height = json.SearchResults.Results[0].ImageMetadata.Height;
        }
        else {
            let xml = await ZoomManager.getFile(url, {type:"xml"})
        
            var infos = xml.getElementsByTagName("Image")[0]
            var size = xml.getElementsByTagName("Size")[0]
            if (!infos || !size) {
                return ZoomManager.error(`Invalid seadragon XML info file: ${url}`)
            }

            if (url.match(/nla\.gov\.au\/.*\/dzi/)) {
                // national library of australia
                data.origin = `${url}?tile=`
            } else {
                //replace extension by _files
                data.origin = `${url.replace(/\.[^.\/]*$/,'')}_files/`;
            }
            data.tileSize = parseInt(infos.getAttribute("TileSize"));
            data.overlap = parseInt(infos.getAttribute("Overlap"));
            data.format = infos.getAttribute("Format");

            data.width = parseInt(size.getAttribute("Width"));
            data.height = parseInt(size.getAttribute("Height"));
        }

        //Zooming factor between two consecutive zoom levels
        data.zoomFactor = 2;
        // 2^maxzoom = max(w,h) (the first tile is 1x1)
        data.maxZoomLevel = Math.ceil(
            Math.log2(Math.max(data.width, data.height))
        );
        ZoomManager.readyToRender(data);
    }
    
    getTileURL(col, row, zoom, data) {
        return data.origin + zoom + "/" + col + "_" + row + "." + data.format;
    }
}


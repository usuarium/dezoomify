"use strict";

import ZoomManager from "../ZoomManager.js"
import sizeOf from 'image-size'

export default class iiif
{
    constructor() {
        const that = this
        
        this.name = 'IIIF'
        this.description = 'International Image Interoperability Framework'
        
        this.urlReg = new RegExp( // IIIF API image URL
            "(https?://[^\"'\\s]+)" + // base
            "(?:/info\\.json|" +
            "/\\^?(?:full|square|(?:pct:)?\\d+,\\d+,\\d+,\\d+)" + // region
            "/(?:full|max|\\d+,|,\\d+|pct:\\d+|!?\\d+,\\d+)" + // size
            "/!?[1-3]?[0-9]?[0-9]" + // rotation
            "/(?:color|gray|bitonal|default|native)" + // quality
            "\\.(?:jpe?g|tiff?|png|gif|jp2|pdf|webp)" + // format
            ")"
        );
        this.gallicaReg = /https?:\/\/gallica\.bnf\.fr\/ark:\/(\w+\/\w+)(?:\/(f\w+))?/
        
        this.urls = [
            this.urlReg,
            this.gallicaReg
        ]
        
        this.contents = [
            this.urlReg
        ]
    }
    
    extractUrl(text) {
        var match = text.match(this.urlReg);
        if (match) {
            return `${match[1]}/info.json`
        }
    }
    
    async findFile(baseUrl) {
        
        let gallicaMatch = baseUrl.match(this.gallicaReg)
        if (gallicaMatch) {
            baseUrl = `https://gallica.bnf.fr/iiif/ark:/${gallicaMatch[1]}/${gallicaMatch[2] || 'f1'}/info.json`
        }
        
        let url = this.extractUrl(baseUrl)
        if (url) {
            return url
        }
        
        let text = await ZoomManager.getFile(baseUrl, {type:"htmltext"})

        url = this.extractUrl(text)
        if (url) {
            return url
        }
        
        throw new Error("No IIIF URL found.");
    }
    
    async open(url) {
        
        let data = await ZoomManager.getFile(url, {type:"json"})
        
        function min(array){
            return Math.min.apply(null, array)
        }
        
        function searchWithDefault(array, search, defaultValue) {
            // Return the searched value if it's in the array.
            // Else, return the first value of the array, or defaultValue if the array is empty or invalid
            var array = (array && array.length) ? array : [defaultValue];
            return ~array.indexOf(search) ? search : array[0];
        }
        
        var tiles = (data.tiles && data.tiles.length)
        ? data.tiles.reduce(function(red, val){
            return min(red.scaleFactors) < min(val.scaleFactors) ? red : val;
        })
        : {"width": data.tile_width || 512, "scaleFactors": [1]};
        
        var returned_data = {
            "origin": data["@id"] || url.replace(/\/info\.json$/, ''),
            "width" : parseInt(data.width),
            "height" : parseInt(data.height),
            "tileSize" : tiles.width,
            "maxZoomLevel" : Math.min.apply(null, tiles.scaleFactors),
            "quality" : searchWithDefault(data.qualities, "native", "default"),
            "format" : searchWithDefault(data.formats, "png", "jpg")
        };
        
        let imgUrl = this.getTileURL(0, 0, returned_data.maxZoomLevel, returned_data)
        let imageBuffer = await ZoomManager.getFile(imgUrl, {type: 'image'})
        var dimensions = sizeOf(imageBuffer);
        
        returned_data.tileSize = Math.max(dimensions.width, dimensions.height)
        
        ZoomManager.readyToRender(returned_data)
    }
    
    getTileURL(x, y, zoom, data) {
        var s = data.tileSize,
            pxX = x*s, pxY = y*s;

        let sx = null, sy = null

        //The image size is adjusted for edges
        //width
        if (pxX + s > data.width) {
            sx = data.width - pxX;
        } else {
            sx = s;
        }

        //height
        if (pxY + s > data.height) {
            sy = data.height - pxY;
        } else {
            sy = s;
        }

        return `${data.origin}/${pxX},${pxY},${sx},${sy}/${sx},/0/${data.quality}.${data.format}`
    }
}

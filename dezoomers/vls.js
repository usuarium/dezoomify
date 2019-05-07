"use strict";

import ZoomManager from "../ZoomManager.js"

export default class VLS
{
    constructor() {
        this.name = 'VLS'
        this.description = 'Visual Library Server, by semantics'
        this.urls = [
            /\/(thumbview|pageview|zoom)\/\d+$/
        ]
        
        this.contents = []
    }
    
    async findFile(baseUrl) {
        return baseUrl.replace(/\/(thumbview|pageview|zoom)\//, '/zoom/')
    }
    
    async open(url) {
        let doc = await ZoomManager.getFile(url, {type: 'xml'})
        
        var vars = {};
        var varNodes = doc.getElementsByTagName('var');
        for (var i = 0; i < varNodes.length; i++) {
            vars[varNodes[i].getAttribute('id')] = varNodes[i].getAttribute('value');
        }
        var mapNode = doc.getElementById('map');

        var id = mapNode ? mapNode.getAttribute('vls:ot_id') : null;
        if (!id) {
            throw new Error('Unable to extract image ID');
        }
        var rotate = mapNode.getAttribute('vls:flip_rotate');
        var width = parseInt(mapNode.getAttribute('vls:width'));
        var height = parseInt(mapNode.getAttribute('vls:height'));
        var zoomLevels = mapNode.getAttribute('vls:zoomsizes').split(',');
        var path = ['/image/tile/wc', rotate, width, '1.0.0', id, zoomLevels.length - 1].join('/');
        var tileSize = parseInt(vars['zoomTileSize']);

        // Workaround: avoid cropping at the bottom
        height = (Math.floor((height - 1) / tileSize) + 1) * tileSize;

        ZoomManager.readyToRender({
            origin: url,
            path: path,
            width: width,
            height: height,
            tileSize: tileSize,
        });
    }

    getTileURL(x, y, zoom, data) {
        return [data.path, x, (data.nbrTilesY - y - 1) + '.jpg'].join('/');
    }
}

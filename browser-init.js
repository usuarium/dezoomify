"use strict";

import ZoomManager from './ZoomManager.js'

import PhpProxy from './downloader/PhpProxy.js'
import Canvas from './image_manager/Canvas.js'
import Browser from './ui/Browser.js'

import Automatic from './dezoomers/automatic.js'
import Zoomify from './dezoomers/zoomify.js'
import Seadragon from './dezoomers/seadragon.js'
import VLS from './dezoomers/vls.js'

let automatic = new Automatic()
let imageManager = new Canvas()
let downloader = new PhpProxy()
let ui = new Browser()

ZoomManager.ui = ui
ZoomManager.imageManager = imageManager
ZoomManager.downloader = downloader
ZoomManager.addDezoomer(automatic);
ZoomManager.addDezoomer(new Zoomify());
ZoomManager.addDezoomer(new Seadragon());
ZoomManager.addDezoomer(new VLS());

ZoomManager.setDezoomer(automatic);

(function() {
    document.getElementById("urlform").onsubmit = function(evt) {
        evt.preventDefault();
        var url = document.getElementById("url").value;
        window.location.hash = url;
    
        ZoomManager.open(url)

        return false;
    }

    // allow to set the URL to be dezoomed by setting the URL hash
    var startURL = decodeURI(window.location.hash.slice(1));
    if (startURL) {
        document.getElementById("url").value = startURL;
    }
})();

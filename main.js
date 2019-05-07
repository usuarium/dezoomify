"use strict";

import ZoomManager from './ZoomManager.js'

import NodeHttpClient from './downloader/NodeHttpClient.js'
import ImageMagick from './image_manager/ImageMagick.js'
import Console from './ui/Console.js'

import Automatic from './dezoomers/automatic.js'
import Zoomify from './dezoomers/zoomify.js'
import Seadragon from './dezoomers/seadragon.js'
import VLS from './dezoomers/vls.js'


let cliArgs = {}

for (let arg of process.argv) {
    let positionOfEqual = arg.indexOf('=')
    let optionName = arg.substring(0, positionOfEqual)
    if (optionName === '--url') {
        cliArgs.url = arg.substring(positionOfEqual+1)
    }
    if (optionName === '--output') {
        cliArgs.output = arg.substring(positionOfEqual+1)
    }
}

if (cliArgs.url === undefined) {
    console.error('url missing')
    process.exit(1)
}
if (cliArgs.output === undefined) {
    console.error('output missing')
    process.exit(1)
}

let automatic = new Automatic()
let imageManager = new ImageMagick()
let downloader = new NodeHttpClient()
let ui = new Console(cliArgs.output)

ZoomManager.ui = ui
ZoomManager.imageLoadWithDownloader = true
ZoomManager.imageManager = imageManager
ZoomManager.downloader = downloader
ZoomManager.addDezoomer(automatic);
ZoomManager.addDezoomer(new Zoomify());
ZoomManager.addDezoomer(new Seadragon());
ZoomManager.addDezoomer(new VLS());

ZoomManager.setDezoomer(automatic);

ZoomManager.open(cliArgs.url)

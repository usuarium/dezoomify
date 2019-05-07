/**
@mainpage Helper classes from zoomifiers

Classes defined here:
 - @ref UI : User interface management, interaction with HTML. SHouldn't be used directly by dezoomers.
 - @ref ZoomManager : Helper to be used by dezoomers
*/

export default class ZoomManager
{
    /**
    Call callback with the contents of the page at url
    @param {string} url
    @param {type:String} options
    @param {fileCallback} callback - callback to call when the file is loaded
    */
    static async getFile(url, params) {
        return await ZoomManager.downloader.getFile(url, params)
    }
    
    /**
    Return the absolute path, given a relative path and a base

    @param {string} path - the path, such as "path/to/other/file.jpg"
    @param {string} base - the base URL, such as "http://test.com/path/to/first/file.html"
    @return {string} resolved - the resolved path, such as "http://test.com/path/to/first/path/to/other/file.jpg"
    */
    static resolveRelative(path, base) {
        // absolute URL
        if (path.match(/\w*:\/\//)) {
            return path;
        }
        // Protocol-relative URL
        if (path.indexOf("//") === 0) {
            var protocol = base.match(/\w+:/) || ["http:"];
            return protocol[0] + path;
        }
        // Upper directory
        if (path.indexOf("../") === 0) {
            return resolveRelative(path.slice(3), base.replace(/\/[^\/]*$/, ''));
        }
        // Relative to the root
        if (path[0] === '/') {
            var match = base.match(/(\w*:\/\/)?[^\/]*\//) || [base];
            return match[0] + path.slice(1);
        }
        //relative to the current directory
        return base.replace(/\/[^\/]*$/, "") + '/' + path;
    }
    
    static addDezoomer(dezoomer) {
        ZoomManager.dezoomersList.push(dezoomer);
    }
    
    /**
     * Start the dezoomifying process
     */
    static async open(url) {
        ZoomManager.init();
        if (url.indexOf("http") !== 0) {
            throw new Error("You must provide a valid HTTP URL.");
        }
        
        if (typeof ZoomManager.dezoomer.findFile === "function") {
            let filePath = await ZoomManager.dezoomer.findFile(url)
            
            ZoomManager.updateProgress(0, "Found image. Trying to open it...")
            ZoomManager.updateProgress(0, "The dezoomer is trying to locate the zoomable image...")
            ZoomManager.dezoomer.open(ZoomManager.resolveRelative(filePath, url))
        } else {
            ZoomManager.updateProgress(0, "Launched dezoomer...")
            await ZoomManager.dezoomer.open(url)
        }
    }
    
    /**
     * Initialize the ZoomManager
     */
    static init() {
        ZoomManager.status = {
            error: false,
            loaded: 0,
            totalTiles: 1
        };
        ZoomManager.imageManager.reset();
    }
    
    /**
     * Set the active dezoomer
     */
    static setDezoomer(dezoomer) {
        ZoomManager.dezoomer = dezoomer;
    }
    
    /**
     * Tells that we are ready
    */
    static readyToRender(data) {
        data.nbrTilesX = data.nbrTilesX || Math.ceil(data.width / data.tileSize);
        data.nbrTilesY = data.nbrTilesY|| Math.ceil(data.height / data.tileSize);
        data.totalTiles = data.totalTiles || data.nbrTilesX*data.nbrTilesY;
        data.zoomFactor = data.zoomFactor || 2;
        data.baseZoomLevel = data.baseZoomLevel || 0;

        ZoomManager.status.totalTiles = data.totalTiles;
        ZoomManager.data = data;
        ZoomManager.imageManager.setupRendering(data);

        ZoomManager.updateProgress(0, "Preparing tiles load...");
        ZoomManager.startTimer();

        var render = ZoomManager.dezoomer.render || ZoomManager.defaultRender;
        setTimeout(render, 1, data); //Give time to refresh the UI, in case render would take a long time
    }
    
    /**
     * Start listening for tile loads
     *
     * @return {Number} The timer ID
     */
    static startTimer() {
        var wasLoaded = 0; // Number of tiles that were loaded last time we watched
        var timer = setInterval(async () => {
            /*Update the User Interface each 500ms, and not in addTile, because it would
            slow down the all process to update the UI too often.*/
            var loaded = ZoomManager.status.loaded, total = ZoomManager.status.totalTiles;
            if (loaded !== wasLoaded) {
                // Update progress if new tiles were loaded
                ZoomManager.updateProgress(100 * loaded / total, "Loading the tiles...");
                wasLoaded = loaded;
            }
            if (loaded >= total) {
                clearInterval(timer);
                let imageBlob = await ZoomManager.imageManager.getImageBlob()
                ZoomManager.ui.loadEnd(imageBlob);
            }
        }, 500);
        return timer;
    }
    
    static loadEnd() {
        // UI.loadEnd();
    }
    
    static updateProgress(progress, msg) {
        ZoomManager.ui.updateProgress(progress, msg);
    }
    
    static defaultRender(data) {
        var zoom = data.maxZoomLevel || ZoomManager.findMaxZoom(data);
        var x=0, y=0;

        function nextTile() {
            var url = ZoomManager.dezoomer.getTileURL(x,y,zoom,data);
            if (data.origin) {
                url = ZoomManager.resolveRelative(url, data.origin);
            }
            ZoomManager.addTile(url, x*data.tileSize, y*data.tileSize);

            x++;
            if (x >= data.nbrTilesX) {x = 0; y++;}
            if (y < data.nbrTilesY) ZoomManager.nextTick(nextTile);
        }

        nextTile();
    }

    /**
     * @function nextTick
     * Call a function, but not immediatly
     * @param {Function} f - the function to call
     */
    static nextTick(f) {
    	return setTimeout(f, 3)
    }
    
    /**
     * Request a tile from the server
     * 
     * @param {String} url - tile URL
     * @param {Number} x - position in px
     * @param {Number} y - position in px
     * @param {Number} [n=0] - Number of time the tile has already been requested
     */
    static async addTile(url, x, y, ntries) {
        //Request a tile from the server and display it once it loaded
        ntries = ntries | 0; // Number of time the tile has already been requested
        
        for (let i = 0; i < 5; i++) {
            try {
                let image = null
                
                // TODO ZoomManager.proxy_tiles function
                if (ZoomManager.imageLoadWithDownloader) {
                    // load from downloader
                    image = await ZoomManager.downloader.loadImage(url)
                }
                else {
                    image = await ZoomManager.imageManager.loadImage(url)
                }
                
                ZoomManager.imageManager.drawTile(image, x, y)
                ZoomManager.status.loaded++;
                return
            }
            catch (e) {
                console.log(e)
                await ZoomManager.asyncTimer(Math.pow(10*Math.random(), ntries))
            }
        }
        
        ZoomManager.error(`Unable to load tile.\nCheck that your internet connection is working and that you can access this url:\n${url}`)
    }
    
    static async asyncTimer(timeout) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve()
            }, timeout);
        })
    }
    
    /**
     * Returns the maximum zoom level, knowing the image size, the tile size, and the multiplying factor between two consecutive zoom levels
     * @param {{width:number, height:number}} metadata
     * @return {number} maxzoom - the maximal zoom level
     */
    static findMaxZoom(data) {
        //For all zoom levels:
        //size / zoomFactor^(maxZoomLevel - zoomlevel) = numTilesAtThisZoomLevel * tileSize
        //For the baseZoomLevel (0 for zoomify), numTilesAtThisZoomLevel=1
        var size = Math.max(data.width, data.height);
        return Math.ceil(Math.log(size/data.tileSize) / Math.log(data.zoomFactor)) + (data.baseZoomLevel||0);
    }

    /**
     * @brief Signal an error
     * 
     * @param {String} errmsg The error text
     * @throws {Error} err The given error
     */
    static error(errmsg) {
        // Display only the first error, until the ZoomManager in reinitialized
        if (!ZoomManager.status.error) {
            ZoomManager.status.error = true;
            ZoomManager.ui.error(errmsg);
            throw new Error(errmsg);
        }
    }
    
    static reset() {
        // This variable will store cookies set by previous requests
        ZoomManager.setDezoomer(ZoomManager.dezoomersList["Select automatically"]);
    }
}

ZoomManager.ui = null
ZoomManager.imageManager = null
ZoomManager.imageLoadWithDownloader = false
ZoomManager.downloader = null
ZoomManager.dezoomersList = [];
ZoomManager.status = {};

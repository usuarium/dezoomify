"use strict";

import fs from 'fs'

export default class Console
{
    constructor(output) {
        this.saveImageTo = output
    }
    /**
     * Update the state of the progress bar.
     * 
     * 
     * @param {Number} percentage (between 0 and 100)
     * @param {String} description current state description
     */
    updateProgress(percent, text) {
        console.log(percent, text)
    }
    
    /**
     * Update UI after the image has loaded.
     */
    loadEnd(tmpImagePath) {
        return new Promise((resolve, reject) => {
            fs.rename(tmpImagePath, this.saveImageTo, function(err) {
                resolve()
            });
        })
    }
    
    error(msg) {
        console.error(`error: ${msg}`)
    }
}

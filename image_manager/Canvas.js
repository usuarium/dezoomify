"use strict";

export default class Canvas
{
    constructor() {
        this.canvas = document.getElementById('rendering-canvas')
    }
    
    /**
     * Adjusts the size of the image, so that is fits page width or page height
     */
    changeSize() {
        var width = this.canvas.width, height = this.canvas.height;
        switch (this.fit) {
            case "width":
                this.fit = "height";
                this.canvas.style.height = window.innerHeight + "px";
                this.canvas.style.width = window.innerHeight / height * width + "px";
                break;
            case "height":
                this.fit = "none";
                this.canvas.style.width = width + "px";
                this.canvas.style.height = height + "px";
                break;
            default:
                this.fit = "width";
                this.canvas.style.width = window.innerWidth + "px";
                this.canvas.style.height = window.innerWidth / width * height + "px";
        }
    }
    
    /**
     * Sets the width and height of the canvas
     * 
     * @param {Object} data : Image source information, containing width and height of the image.
     */
    setupRendering(data) {
        this.canvas.width = data.width;
        this.canvas.height = data.height;
        this.canvas.onclick = this.changeSize;
        this.ctx = this.canvas.getContext('2d');
        this.changeSize();
    }
    
    /**
     * Draw a tile on the canvas, at the given position.
     * 
     * @param {Image} tile : The tile image
     * @param {Number} x position
     * @param {Number} y position
     */
    drawTile(tileImg, x, y) {
    	this.ctx.drawImage(tileImg, x, y);
    }
    
    /**
     * Reset the UI to the initial state.
     */
    reset() {
        this.canvas.width = this.canvas.height = 0;
    }
    
    async getImageBlob() {
        return new Promise((resolve, reject) => {
            try {
                this.canvas.toBlob(function(blob){
                    resolve(blob)
                }, "image/jpeg", 0.95);
            }
            catch (e) {
                reject(e)
            }
            
        })
    }
    
    async loadImage(url) {
        return new Promise((resolve, reject) => {
            let img = new Image;
            img.addEventListener("load", function () {
                resolve(img)
            });
            img.addEventListener('error', function(evt) {
                reject(new Error('loading error'))
            })
            img.src = url
        })
        
    }
}

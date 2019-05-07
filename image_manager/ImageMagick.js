"use strict";

import fs from 'fs'
import childProcess from 'child_process'

const spawn = childProcess.spawn

export default class ImageMagick
{
    /**
     * Reset the UI to the initial state.
     */
    reset() {
        
    }
    
    /**
     * Sets the width and height of the canvas
     * 
     * @param {Object} data : Image source information, containing width and height of the image.
     */
    setupRendering(data) {
        this.data = data
    }
    
    drawTile(tileImg, x, y) {
        let rows = y / this.data.tileSize
        let cols = x / this.data.tileSize
        let imageIndex = (rows * this.data.nbrTilesX) + cols
        fs.writeFile(`tmp/tile_${imageIndex}.jpg`, tileImg, (err) => {});
    }
    
    async createRows() {
        let imagesInRow = this.data.nbrTilesX
        let numberOfRows = this.data.nbrTilesY
        let promiseBuffer = []
        let options = {
            cwd: 'tmp/'
        }
        
        for (let i = 0; i < numberOfRows; i++) {
            promiseBuffer.push(new Promise((resolve, reject) => {
                let args = []
                for (let v = imagesInRow*i; v < imagesInRow*(i+1); v++) {
                    args.push(`tile_${v}.jpg`)
                }
                args.push('-geometry')
                args.push('+0+0')
                args.push('-tile')
                args.push(`${imagesInRow}x1`)
                args.push(`row_${i}.jpg`)

                let process = spawn('/Volumes/Data/usr/local/bin/montage', args, options)
                
                process.stdout.on('data', (data) => {
                    console.log(`stdout: ${data}`);
                });

                process.stderr.on('data', (data) => {
                    console.log(`stderr: ${data}`);
                });
                
                process.on('exit', () => {
                    resolve()
                })
            }))
        }
        
        return Promise.all(promiseBuffer)
    }

    async mergeRows() {
        let imagesInRow = this.data.nbrTilesX
        let numberOfRows = this.data.nbrTilesY
        let promiseBuffer = []
        let fullSizeTmpImageName = 'image.jpg'
        let tmpPath = 'tmp'
        let options = {
            cwd: tmpPath
        }

        return new Promise((resolve, reject) => {
            let args = []
            for (let v = 0; v < numberOfRows; v++) {
                args.push(`row_${v}.jpg`)
            }
            args.push('-geometry')
            args.push('+0+0')
            args.push('-tile')
            args.push(`1x${numberOfRows}`)
            args.push(fullSizeTmpImageName)
            console.log(args)
            let process = spawn('/Volumes/Data/usr/local/bin/montage', args, options)

            process.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });

            process.stderr.on('data', (data) => {
                console.log(`stderr: ${data}`);
            });
            
            process.on('exit', () => {
                resolve(`${tmpPath}/${fullSizeTmpImageName}`)
            })
        })
    }
    
    async cleanup() {
        let options = {
            cwd: 'tmp/',
            shell: true
        }
        
        return new Promise((resolve, reject) => {
            let process = spawn('rm', ['-rf', 'tile_*', 'row_*'], options)

            process.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });

            process.stderr.on('data', (data) => {
                console.log(`stderr: ${data}`);
            });
            
            process.on('exit', () => {
                resolve()
            })
        })
    }

    async getImageBlob() {
        await this.createRows()
        let imagePath = await this.mergeRows()
        
        await this.cleanup()
        
        return imagePath
    }
}
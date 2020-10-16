"use strict";

import http from 'http'
import https from 'https'
import xmldom from 'xmldom'

const DOMParser = xmldom.DOMParser

export default class NodeHttpClient
{
    constructor(proxy) {
        this.cookies = ''
        
        this.entityDecoderDict = {
            "&amp;": "&",
            "&lt;": "<",
            "&gt;": ">",
            "&quot;": "\""
        }
        this.entityDecoderRegex = /&(?:amp|lt|gt|quot|#(?:x[\da-f]+|\d+));/gi;
    }
    
    async getFile(url, params) {
        
        let client
        if (url.indexOf('http:') === 0) {
            client = http
        }
        else {
            client = https
        }
        
        return new Promise((resolve, reject) => {
            let request = client.get(url, function (message) {
                let contentSize = message.headers['content-length'] * 1
                let buffer = contentSize > 0 ? Buffer.alloc(contentSize) : Buffer.alloc(1024*1024)
                let downloadedContentSize = 0
            
                let cookie = message.headers['set-cookie']
                if (cookie) {
                    // console.log(cookie)
                }
                
                message.on('data', function (data) {
                    let chunkSize = data.length
                    // console.log("ch size", chunkSize)
                    data.copy(buffer, downloadedContentSize, 0, chunkSize)
                    downloadedContentSize += chunkSize
                })

                message.on('end', function () {
                    if (message.statusCode !== 200) {
                        console.error(`${message.statusCode} for url ${url}`)
                        reject()
                        return
                    }
                    
                    // console.log("dlc size", downloadedContentSize)
                    if (params.type === 'image') {
                        resolve(buffer)
                    }
                    else if (params.type === 'json') {
                        resolve(JSON.parse(buffer.toString('utf8')))
                    }
                    else if (params.type === 'htmltext') {
                        let responseString = buffer.toString('utf8')
                        resolve(responseString)
                    }
                    else {
                        let responseString = buffer.toString('utf8')
                        let responseDom = new DOMParser().parseFromString(responseString)
                        resolve(responseDom)
                    }
                })
            })
            .on('error', function(err) {
                console.error(err)
            });
            
            // request.setHeader('Cookie', ['type=ninja', 'language=javascript'])
        })
    }
    
    async loadImage(url) {
        return await this.getFile(url, {type: 'image'})
    }
}
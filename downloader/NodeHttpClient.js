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
                let buffer = Buffer.alloc(contentSize)
                let downloadedContentSize = 0
            
                let cookie = message.headers['set-cookie']
                if (cookie) {
                    // console.log(cookie)
                }
                
                // console.log(message.headers)
            
                message.on('data', function (data) {
                    let chunkSize = data.length
                    data.copy(buffer, downloadedContentSize, 0, chunkSize)
                    downloadedContentSize += chunkSize
                })

                message.on('end', function () {
                    if (params.type === 'image') {
                        resolve(buffer)
                    }
                    else {
                        let responseString = buffer.toString('utf8')
                        let responseDom = new DOMParser().parseFromString(responseString)
                        resolve(responseDom)
                    }
                })
            })
            
            // request.setHeader('Cookie', ['type=ninja', 'language=javascript'])
        })
    }
    
    async loadImage(url) {
        return await this.getFile(url, {type: 'image'})
    }
}
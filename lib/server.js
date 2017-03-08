/**
 * lib/server.js - comms
 * 
 * Licensed under MIT license.
 * Copyright (C) 2017 Karim Alibhai.
 */

const { EventEmitter } = require('events')
const dgram = require('dgram')

class Server {
  constructor (options) {
    options = typeof options === 'object' ? options : {}

    this._models = {}
    this._emitter = new EventEmitter()
    this._protocol = options.protocol || 'udp4'
  }

  on () { return this._emitter.on.apply(this._emitter, arguments) }
  once () { return this._emitter.once.apply(this._emitter, arguments) }
  off () { return this._emitter.removeListener.apply(this._emitter, arguments) }

  model (name, model) {
    if (this._models.hasOwnProperty(name)) {
      throw new Error(`Model "${name}" already exists.`)
    }

    this._models[name] = model
    return this
  }

  /**
   * Declares JSON representation of the server object as
   * list of events and their fields.
   */
  toJSON () {
    /*let object = {}

    for (let key in this._models) {
      if (this._models.hasOwnProperty(key)) {
        let { type, fields } = this._models[key]
        object[key] = { type, fields }
      }
    }

    return object*/
    return this._models
  }

  /**
   * 
   * @param {Number} port valid port number to bind server to
   * @param {Function} handler callback to attach to the 'listening' event
   */
  listen (port, handler) {
    if (typeof handler === 'function') {
      this.on('listening', handler)
    }

    setImmediate(() => {
      const server = dgram.createSocket(this._protocol)

      server.on('message', (msg, rinfo) => {
        console.log('%j => %j', rinfo, msg)

        // a single null byte is treated as a request for the
        // event map. errors are irrelevant since this isn't an important
        // message
        if (msg.length === 1 && msg[0] === 0) {
          server.send(JSON.stringify(this), rinfo.port, rinfo.address, _ => 0)
        }

        // for all other data, try and parse appropriately
        else {
          // ...
        }
      })

      server.on('error', err => this._emitter.emit('error', err))
      server.on('listening', _ => this._emitter.emit('listening'))

      server.bind(port)
    })
    
    return this
  }
}

module.exports = options => new Server(options)
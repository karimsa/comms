/**
 * lib/client.js - comms
 * 
 * Licensed under MIT license.
 * Copyright (C) 2017 Karim Alibhai.
 */

const { EventEmitter } = require('events')
const dgram = require('dgram')

class Client {
  constructor (port, host, protocol) {
    if (typeof port !== 'number' || typeof host !== 'string') {
      throw new Error('Invalid arguments.')
    }

    this._port = port
    this._host = host
    this._protocol = protocol || 'udp4'
    this._client = dgram.createSocket(this._protocol)
    this._emitter = new EventEmitter()
    this._events = null
    this._closed = false

    // automatically seal the class once an error fires off
    this._emitter.on('error', _ => {
      this._closed = true
      this._client.unref()
      this.unref()
    })

    // forward errors on the socket to errors of the client
    this._client.on('error', err => this._emitter.emit('error', err))

    // handle incoming data
    this._client.on('message', (msg, rinfo) => {
      if (this._closed) return;
      console.log('%j => %j', rinfo, msg)

      // the first emitted event MUST be the event map
      // otherwise we cannot proceed
      if (this._events === null) {
        try {
          this._events = JSON.parse(msg.toString('utf8'))
          this._emitter.emit('ready')
        } catch (err) {
          this._emitter.emit('error', err)
        }
      }

      // once we have an event map, we can parse all event
      // data that is sent over
      else {
        // ...
      }
    })

    // a single null byte is how we request the event map
    this._client.send(Buffer.from([0]), this._port, this._host, err => {
      if (err) this._emitter.emit('error', err)
    })

    // a binding to keep node alive
    this._ref = null
    this.ref()
  }

  /**
   * Keeps node alive while socket is open.
   */
  ref () {
    if (this._ref === null) {
      this._ref = setInterval(_ => 0, 2147483647)
    }

    return this
  }

  /**
   * Allows node to die without waiting for socket to close.
   */
  unref() {
    clearTimeout(this._ref)
    this._ref = null
    return this
  }

  on () { return this._emitter.on.apply(this._emitter, arguments) }
  once () { return this._emitter.once.apply(this._emitter, arguments) }
  off () { return this._emitter.removeListener.apply(this._emitter, arguments) }
}

module.exports = (port, host, protocol) => new Client(port, host, protocol)
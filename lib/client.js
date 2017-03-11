/**
 * lib/client.js - fldsmdfr
 * 
 * Licensed under MIT license.
 * Copyright (C) 2017 Karim Alibhai.
 */

const dgram = require('dgram')
const { EventEmitter } = require('events')
const debug = require('util').debuglog('fldsmdfr')

const Parser = require('./parser')
const Models = require('./models')
const INIT = Buffer.from([ 0xff ])
const EOT = Buffer.from([ 0x02 ])

class Client {
  constructor (path, options) {
    // get host and port from path
    if (path.indexOf(':') === -1) {
      throw new Error('You must specify a hostname AND port number.')
    }

    let [host, port] = path.split(':')
    port = parseInt(port, 10)

    // user name is required, it's how you're matched to a key
    if (typeof options.user !== 'string') {
      throw new Error('User name must be specified.')
    }

    this._port = port
    this._host = host
    this._client = dgram.createSocket(options.protocol || 'udp4')
    this._emitter = new EventEmitter()
    this._events = null
    this._closed = false
    this._user = options.user
    this._models = new Models(options)
    this._serverModels = new Models(options)
    this._serverKey = options.server_key

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
      debug('[%s] %j => %j', this._ready, rinfo, msg)

      // the first emitted event MUST be the event map
      // otherwise we cannot proceed
      if (!this._ready) {
        try {
          let header = JSON.parse(msg.toString('utf8'))

          this._serverModels.setModels(header.routes, header.models)
          this._ready = true
          this._emitter.emit('ready')
        } catch (err) {
          this._emitter.emit('error', err)
        }
      }

      // once we have an event map, we can parse all event
      // data that is sent over
      else {
        const [model, data] = this._models.decompress(this._serverKey, msg)
        this._emitter.emit(model, data)
      }
    })

    // a binding to keep node alive
    this._ref = null
  }

  /**
   * Emits an event remotely with given data.
   * 
   * @param {String} event a named event
   * @param {Object} data event-related data you would like to emit
   * @returns {Client} current object for chaining
   */
  emit (event, data) {
    this._client.send(this._serverModels.compress(this._serverKey, event, data, this._user), this._port, this._host, err => {
      if (err) this._emitter.emit('error', err)
    })

    return this
  }

  /**
   * Defines a new model with static types.
   * @param {String} name the name of the model and corresponding route
   * @param {Object} model an object defining the static mappings of your data
   * @returns {Server} current object for chaining
   */
  model (name, model) {
    this._models.add(name, model)
    return this
  }

  /**
   * Initiates connection with server.
   * @param {Function} callback (optional) event handler to attach to 'ready' event
   * @returns {Client} current object for chaining
   */
  connect (callback) {
    if (typeof callback === 'function') {
      this.on('ready', callback)
    }

    // start off with handshake
    this._client.send(Buffer.concat([
      INIT,
      Buffer.from(this._user, 'utf8'),
      EOT,
      Buffer.from(JSON.stringify(this._models), 'utf8')
    ]), this._port, this._host, err => {
      if (err) this._emitter.emit('error', err)
    })

    // a binding to keep node alive
    this.ref()

    return this
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
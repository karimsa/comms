/**
 * lib/server.js - fldsmdfr
 * 
 * Licensed under MIT license.
 * Copyright (C) 2017 Karim Alibhai.
 */

const dgram = require('dgram')
const { EventEmitter } = require('events')
const debug = require('util').debuglog('fldsmdfr')

const Models = require('./models')
const TYPES = require('./types')

/**
 * Single connection handler.
 */
class Socket {
  constructor (server, buffer, key, pubkey, rinfo) {
    this._port = rinfo.port
    this._host = rinfo.address
    this._lastts = Date.now()
    this._emitter = new EventEmitter()
    this._server = server
    this._key = key
    this._pubkey = pubkey

    // grab models from buffer
    const header = JSON.parse(buffer.toString('utf8'))
    this._models = new Models({ key })
    this._models.setModels(header.routes, header.models)
  }

  on () { return this._emitter.on.apply(this._emitter, arguments) }
  once () { return this._emitter.once.apply(this._emitter, arguments) }
  off () { return this._emitter.removeListener.apply(this._emitter, arguments) }

  /**
   * Emits an event remotely with given data.
   * 
   * @param {String} event a named event
   * @param {Object} data event-related data you would like to emit
   * @returns {Client} current object for chaining
   */
  emit (event, data) {
    try {
      this._server.send(this._models.compress(this._pubkey, event, data), this._port, this._host, err => {
        if (err) this._emitter.emit('error', err)
      })
    } catch (err) {
      this._emitter.emit('error', err)
    }

    return this
  }

  /**
   * Closes an open connection with the client.
   */
  close () {
    this.emit('close')
    this._closed = true
    return this
  }
}

/**
 * Server handler.
 */
class Server extends EventEmitter {
  constructor (options) {
    super()
    options = typeof options === 'object' ? options : {}

    // public keys are required for proper encryption
    if (!options.hasOwnProperty('clients') || Object.keys(options.clients).length === 0) {
      throw new Error('No public keys given for any clients.')
    }

    // fix ttl (default = 10 seconds)
    this._ttl = options.ttl|0
    this._ttl = this._ttl < 0 || isNaN(this._ttl) ? 10000 : this._ttl
    this._models = new Models(options)
    this._socks = {}
    this._protocol = options.protocol || 'udp4'
    this._clients = options.clients

    // every TTL ms, check for bad sockets
    const gbc = () => {
      for (let user in this._socks) {
        if (this._socks.hasOwnProperty(user) && (Date.now() - this._socks._lastts) > this._ttl) {
          // remove from socket list
          const sock = this._socks[user]
          delete this._socks[user]

          // mark as 'closed'
          sock.emit('error', new Error('Socket timed out.'))
          sock.emit('close')
        }
      }

      setTimeout(gbc, this._ttl + 1)
    }
    
    // spin up gbc (later)
    setTimeout(gbc, this._ttl + 1)
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
   * JSON representation of static mappings.
   */
  toJSON () {
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
        debug('%j => %j', rinfo, msg)

        if (msg.readInt8() === -1) {
          const [user, buffer] = TYPES.string.decompress(msg.slice(1))

          // if the user already has a session, we ignore
          if (this._socks.hasOwnProperty(user)) {
            return
          }

          // otherwise create a new session
          this._socks[user] = new Socket(server, buffer, this._models.key, this._clients[user], rinfo)

          // respond with event data
          server.send(Buffer.from(JSON.stringify(this), 'utf8'), rinfo.port, rinfo.address, err => {
            if (err) this.emit('error', err)

            // emit the connection event
            this.emit('connection', this._socks[user], {
              user,
              address: rinfo.address,
              port: rinfo.port
            })
          })
        } else {
          const [user, buffer] = TYPES.string.decompress(msg)

          // only real users can pass
          if (!this._clients.hasOwnProperty(user)) {
            return this.emit('unauthorizedRequest', { user, rinfo, raw: msg })
          }

          try {
            const [model, data] = this._models.decompress(this._clients[user], buffer)

            // reset timer
            this._socks[user]._lastts = Date.now()

            // emit off event with data
            this._socks[user]._emitter.emit(model, data, rinfo)
          } catch (error) {
            this.emit('invalidRoute', { error, user, rinfo, raw: msg })
          }
        }
      })

      server.bind(port)
    })
    
    return this
  }
}

module.exports = options => new Server(options)

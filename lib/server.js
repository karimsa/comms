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

/**
 * Single connection handler.
 */
class Socket {
  constructor (server, user, rinfo) {
    this._user = user
    this._rinfo = rinfo
    this._lastts = Date.now()
    this._emitter = new EventEmitter()
    this._server = server
  }

  on () { return this._emitter.on.apply(this._emitter, arguments) }
  once () { return this._emitter.once.apply(this._emitter, arguments) }
  off () { return this._emitter.removeListener.apply(this._emitter, arguments) }

  emit (event, data) {
    if (this._closed) return this

    // TODO
    throw new Error('Unimplemented method: emit()')

    return this
  }

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

    // fix ttl (default = 10 seconds)
    this._ttl = options.ttl|0
    this._ttl = this._ttl < 0 || isNaN(this._ttl) ? 10000 : this._ttl
    this._models = new Models(options)
    this._socks = {}
    this._protocol = options.protocol || 'udp4'

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

        // a single null byte is treated as a request for the
        // event map. errors are irrelevant since this isn't an important
        // message
        if (msg.length === 1 && msg[0] === 0) {
          server.send(JSON.stringify(this), rinfo.port, rinfo.address, _ => 0)
        }

        // for all other data, try and parse appropriately
        else {
          try {
            const [user, model, data] = this._models.decompress(msg)

            // create socket if it doesn't exist
            if (!this._socks.hasOwnProperty(user)) {
              debug('New connection of %s from %s:%s', user, rinfo.address, rinfo.port)

              this._socks[user] = new Socket(server, user, rinfo)
              this.emit('connection', this._socks[user], {
                user,
                address: rinfo.address,
                port: rinfo.port
              })
            }

            // reset timer
            this._socks[user]._lastts = Date.now()

            // event must be emitted on socket
            setTimeout(() => {
              this._socks[user]._emitter.emit(model, data, rinfo)
            }, 0)
          } catch (err) {
            debug(err)
          }
        }
      })

      server.bind(port)
    })
    
    return this
  }
}

module.exports = options => new Server(options)

/**
 * lib/server.js - fldsmdfr
 * 
 * Licensed under MIT license.
 * Copyright (C) 2017 Karim Alibhai.
 */

const os = require('os')
const dgram = require('dgram')
const crypto = require('crypto')
const { EventEmitter } = require('events')
const debug = require('util').debuglog('fldsmdfr')

const TYPES = require('./types')
const Parser = require('./parser')

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

    // private key is required to generate the secret
    if (!options.hasOwnProperty('key')) {
      throw new Error('Missing private key in server options.')
    }

    // public keys are required for proper encryption
    if (!options.hasOwnProperty('clients') || Object.keys(options.clients).length === 0) {
      throw new Error('No public keys given for any clients.')
    }

    let ecdh = crypto.createECDH(options.curve || 'secp256k1')
    ecdh.setPrivateKey(options.key)

    // encrypt/decrypt functions are created with local scope so
    // that the ecdh object only exists locally

    this._encrypt = (user, data) => {
      let cipher = crypto.createCipher(this._cipher, ecdh.computeSecret(options.clients[user]))
      return Buffer.concat([
        cipher.update(data, 'utf8'),
        cipher.final()
      ])
    }

    this._decrypt = (user, data) => {
      let decipher = crypto.createDecipher(this._cipher, ecdh.computeSecret(options.clients[user]))
      return Buffer.concat([
        decipher.update(data),
        decipher.final()
      ]).toString('utf8')
    }

    // fix ttl (default = 10 seconds)
    this._ttl = options.ttl|0
    this._ttl = this._ttl < 0 || isNaN(this._ttl) ? 10000 : this._ttl

    // default ciphers are based on nodejs cipher benchmarks
    this._cipher = options.cipher || (os.platform() === 'darwin' ? 'rc4-40' : 'aes-128-ctr')
    this._models = {}
    this._routes = []
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
    if (this._models.hasOwnProperty(name)) {
      throw new Error(`Model "${name}" already exists.`)
    }

    this._models[name] = new Parser(model)
    this._routes.push(name)

    return this
  }

  /**
   * Declares JSON representation of the server object as
   * list of events and their fields.
   */
  toJSON () {
    return {
      routes: this._routes,
      models: this._models
    }
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
          let route = msg[0]
          let model = this._routes[route]
          let [user, data] = TYPES.string.decompress(msg.slice(1))

          try {
            if (!model) throw new Error('Invalid route attempted by client.')
            data = this._models[model].decompress(Buffer.from(this._decrypt(user, data), 'utf8'))

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

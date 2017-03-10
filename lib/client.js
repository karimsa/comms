/**
 * lib/client.js - fldsmdfr
 * 
 * Licensed under MIT license.
 * Copyright (C) 2017 Karim Alibhai.
 */

const os = require('os')
const dgram = require('dgram')
const crypto = require('crypto')
const { EventEmitter } = require('events')
const debug = require('util').debuglog('fldsmdfr')

const Parser = require('./parser')
const EOT = Buffer.from([ 0x02 ])

class Client {
  constructor (path, options) {
    // get host and port from path
    if (path.indexOf(':') === -1) {
      throw new Error('You must specify a hostname AND port number.')
    }

    let [host, port] = path.split(':')
    port = parseInt(port, 10)

    // ensure that key is there
    if (!(options.key instanceof Buffer)) {
      console.log('You must provide a valid key (as a buffer).')
    }

    // user name is required, it's how you're matched to a key
    if (typeof options.user !== 'string') {
      throw new Error('User name must be specified.')
    }

    // get ecdh secret
    const ecdh = crypto.createECDH(options.curve || 'secp256k1')
    ecdh.setPrivateKey(options.key)
    const secret = ecdh.computeSecret(options.server_key)

    // create encrypt/decrypt functions
    this._encrypt = data => {
      let cipher = crypto.createCipher(this._cipher, secret)
      return Buffer.concat([
        cipher.update(data, 'utf8'),
        cipher.final()
      ])
    }

    this._decrypt = data => {
      let decipher = crypto.createCipher(this._cipher, secret)
      return Buffer.concat([
        decipher.update(data),
        decipher.final()
      ]).toString('utf8')
    }

    // default ciphers are based on nodejs cipher benchmarks
    this._cipher = options.cipher || (os.platform() === 'darwin' ? 'rc4-40' : 'aes-128-ctr')
    this._user = options.user
    this._port = port
    this._host = host
    this._client = dgram.createSocket(options.protocol || 'udp4')
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
      debug('%j => %j', rinfo, msg)

      // the first emitted event MUST be the event map
      // otherwise we cannot proceed
      if (this._events === null) {
        try {
          let header = JSON.parse(msg.toString('utf8'))

          this._routes = header.routes
          this._models = header.models

          for (let model of header.routes) {
            this._models[model] = new Parser(this._models[model])
          }

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
   * Emits an event remotely with given data.
   * 
   * @param {String} event a named event
   * @param {Object} data event-related data you would like to emit
   * @returns {Client} current object for chaining
   */
  emit (event, data) {
    let index = this._routes.indexOf(event)

    // verify route
    if (index === -1) {
      throw new Error('Invalid route attempted: ' + event)
    }

    // compress data
    let buffer = this._models[event].compress(data)
    debug(buffer)

    // encrypt buffer
    data = Buffer.concat([
      Buffer.from([ index ]),
      Buffer.from(this._user, 'utf8'),
      EOT,
      this._encrypt(buffer)
    ])

    // send out buffer
    this._client.send(data, this._port, this._host, err => {
      if (err) this._emitter.emit('error', err)
    })

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

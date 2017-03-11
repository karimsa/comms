/**
 * lib/models.js - fldsmdfr
 * 
 * Licensed under MIT license.
 * Copyright (C) 2017 Karim Alibhai.
 */

const os = require('os')
const crypto = require('crypto')
const debug = require('util').debuglog('fldsmdfr')

const TYPES = require('./types')
const Parser = require('./parser')
const EOT = Buffer.from([ 0x02 ])
const NULL = Buffer.alloc(0)

module.exports = class Models {
  constructor (options) {
    this.models = {}
    this.routes = []

    // private key is required to generate the secret
    if (!options.hasOwnProperty('key')) {
      throw new Error('Missing private key in server options.')
    }

    // create an ECDH object for first key exchange
    this.key = options.key
    this.ecdh = crypto.createECDH(options.curve || 'secp256k1')
    this.ecdh.setPrivateKey(options.key)

    // default chosen based on node cipher benchmark
    this.cipher = options.cipher || 'aes-128-ctr'
  }

  /**
   * Encrypt secret data with client's public key.
   * 
   * @param {Buffer} key a valid public ECDH key
   * @param {Buffer} data raw data
   * @returns {String} decrypted data in utf8
   */
  encrypt (key, data) {
    let cipher = crypto.createCipher(this.cipher, this.ecdh.computeSecret(key))
    return Buffer.concat([
      cipher.update(data),
      cipher.final()
    ])
  }

  /**
   * Decrypt secret data using client's public key.
   * 
   * @param {Buffer} key a valid public ECDH key
   * @param {Buffer} data encrypted data
   * @returns {String} decrypted data in utf8
   */
  decrypt (key, data) {
    let decipher = crypto.createDecipher(this.cipher, this.ecdh.computeSecret(key))
    return Buffer.concat([
      decipher.update(data),
      decipher.final()
    ])
  }

  /**
   * Defines a new model with static types.
   * @param {String} name the name of the model and corresponding route
   * @param {Object} model an object defining the static mappings of your data
   * @returns {Models} current object for chaining
   */
  add (name, model) {
    if (this.models.hasOwnProperty(name)) {
      throw new Error(`Model "${name}" already exists.`)
    }

    this.models[name] = new Parser(model)
    this.routes.push(name)

    return this
  }

  /**
   * Sets all model maps as a single object.
   * 
   * @param {Array} routes list of routes to load from models object
   * @param {Object} models a mapping of all events and their static maps
   * @returns {Models} current object for chaining
   */
  setModels (routes, models) {
    this.routes = routes
    this.models = models

    // compile all models into parsers
    for (let route of routes) {
      this.models[route] = new Parser(this.models[route])
    }

    return this
  }

  /**
   * Declares JSON representation of the server object as
   * list of events and their fields.
   */
  toJSON () {
    return {
      routes: this.routes,
      models: this.models
    }
  }

  /**
   * Compresses an event object given data and the event.
   * 
   * @param {Buffer} key the client's public key
   * @param {String} event the underlying event name
   * @param {Object} data the data that must be sent
   * @param {String} user an optional user name to include in the data
   * @returns {Buffer} the compressed data as a buffer
   */
  compress (key, event, data, user) {
    let index = this.routes.indexOf(event)

    // verify route
    if (index === -1) {
      throw new Error('Invalid route attempted: ' + event)
    }

    // compress data
    let buffer = this.models[event].compress(data)
    debug(buffer)

    // return the built buffer
    return Buffer.concat([
      user ? Buffer.from(user, 'utf8') : NULL,
      user ? EOT : NULL,
      Buffer.from([ index ]),
      this.encrypt(key, buffer)
    ])
  }

  /**
   * Decompresses an encrypted and compressed buffer of data.
   * 
   * @param {Buffer} key public key of the client to use for decryption
   * @param {Buffer} buffer the buffer containing all encrypted data
   * @returns {Object} decompressed data
   */
  decompress (key, buffer) {
    const route = buffer[0]
    const model = this.routes[route]

    if (!model) throw new Error('Invalid route attempted by client.')

    return [
      model,
      this.models[model].decompress(this.decrypt(key, buffer.slice(1)))
    ]
  }
}
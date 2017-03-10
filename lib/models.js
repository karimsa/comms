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

module.exports = class Models {
  constructor (options) {
    this.models = {}
    this.routes = []
    this.clients = options.clients || {}

    // private key is required to generate the secret
    if (!options.hasOwnProperty('key')) {
      throw new Error('Missing private key in server options.')
    }

    // public keys are required for proper encryption
    if (!options.hasOwnProperty('clients') || Object.keys(options.clients).length === 0) {
      throw new Error('No public keys given for any clients.')
    }

    // create an ECDH object for first key exchange
    this.ecdh = crypto.createECDH(options.curve || 'secp256k1')
    this.ecdh.setPrivateKey(options.key)

    // default ciphers are based on nodejs cipher benchmarks
    this.cipher = options.cipher || (os.platform() === 'darwin' ? 'rc4-40' : 'aes-128-ctr')
  }

  encrypt (user, data) {
    let cipher = crypto.createCipher(this.cipher, this.ecdh.computeSecret(this.clients[user]))
    return Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ])
  }

  decrypt (user, data) {
    let decipher = crypto.createDecipher(this.cipher, this.ecdh.computeSecret(this.clients[user]))
    return Buffer.concat([
      decipher.update(data),
      decipher.final()
    ]).toString('utf8')
  }

  /**
   * Defines a new model with static types.
   * @param {String} name the name of the model and corresponding route
   * @param {Object} model an object defining the static mappings of your data
   * @returns {Server} current object for chaining
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
   * Declares JSON representation of the server object as
   * list of events and their fields.
   */
  toJSON () {
    return {
      routes: this.routes,
      models: this.models
    }
  }

  compress (data) {
    // ...
  }

  decompress (buffer) {
    const route = buffer[0]
    const model = this.routes[route]
    const [user, data] = TYPES.string.decompress(buffer.slice(1))

    if (!model) throw new Error('Invalid route attempted by client.')
    return [
      user,
      model,
      this.models[model].decompress(Buffer.from(this.decrypt(user, data), 'utf8'))
    ]
  }
}

/*

new Models({
  key: fs.readFileSync('./keys/server.key'),
  clients: {
    bob: fs.readFileSync('./keys/bob.pub')
  }
})

*/
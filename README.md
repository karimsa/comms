# comms [![Build Status](https://travis-ci.com/karimsa/comms.svg?token=bynzkcTP4XciV8soPs5e&branch=master)](https://travis-ci.com/karimsa/comms) [![codecov](https://codecov.io/gh/karimsa/comms/branch/master/graph/badge.svg?token=e8bsOKgTpK)](https://codecov.io/gh/karimsa/comms)

Rapid &amp; secure communications module.

## Motivation

For some IoT-related projects, you need a very lightweight application
protocol implemented over UDP. But when you write your application, the
higher-level API should maintain the advantages of a simple server-client
architecture (i.e. like how node's net module does).

comms is a module that solves these needs for me. I hope it is of use to you
as well.

# TL;DR

**Install:** `npm install --save comms`

**Server:**
```javascript
const server = require('comms')({
  key: fs.readFileSync(__dirname + '/keys/alice.key'),

  // you must define your clients by name and provide a buffer
  // containing the client's public ECDH key
  clients: {
    bob: fs.readFileSync(__dirname + '/keys/bob.pub')
  }
})

server.model('message', { message: 'string' })
server.on('message', ({ message }) => console.log('Received: %j', message)))

server.listen(8080, () => console.log('okay im ready'))
```

**Client:**
```javascript
const client = require('comms').connect('localhost:8080', {
  user: 'bob',
  key: fs.readFileSync(__dirname + '/keys/bob.key'),
  server_key: fs.readFileSync(__dirname + '/keys/alice.pub')
})
client.on('ready', () => client.emit('message', { message: 'Hello, world' }))
```

## Usage

To install comms, you can use npm like so: `npm install --save comms`.

You can then use it in a way similar to `socket.io`. There are two moving parts:
the server and the client. Servers must declare models they use for communication
(which are statically typed) and then define routes that respond to those models.

They must also define their potentional clients by name and public key. The name is used
for a key lookup and the public key is used along with the server's private key to generate
a secret using the ECDH algorithm. The secret is then used to encrypt all data using
the given cipher or aes-128-ctr by default (on linux - otherwise rc4-40 is used on macOS).

For instance, to receive a single string called `superCoolMessage` in a model called message,
you would declare the model like so:

```javascript
const server = require('comms')({
  key: fs.readFileSync(__dirname + '/keys/alice.key'),
  clients: {
    bob: fs.readFileSync(__dirname + '/keys/bob.pub')
  }
})

server.model('message', { superCoolMessage: 'string' })
```

Here, we have defined `superCoolMessage` to be of type string. When the client connects, the
client will then have access to this static mapping and will use it to encode information.
The next thing we must do is create an event handler that can respond to when data
is received through this model. To do so, attach to the event with the same name
as the model:

```javascript
server.on('message', event => {
  console.log(event.superCoolMessage)
})
```

The `event` object contains the data that was sent by the client in this event. It
will only contain the data that was outlined by your static map (i.e. only the field
`superCoolMessage`). You can use it however you'd like.

You can now bind the server to a given port and be free:

```javascript
server.listen(8080, () => console.log('k im listening @ port 8080'))
```

On the client side, simply initiate a connection and emit events:

```javascript
const client = require('comms').connect('localhost:8080', {
  user: 'bob',
  key: fs.readFileSync(__dirname + '/keys/bob.key'),
  server_key: fs.readFileSync(__dirname + '/keys/alice.pub')
})

client.on('ready', () =>
  client.emit('message', { superCoolMessage: 'im batman' })
)
```

The server should now print 'im batman' to the console.

## License

Licensed under [MIT license](LICENSE.md).

Copyright &copy; 2017 Karim Alibhai.
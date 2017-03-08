# comms [![Build Status](https://travis-ci.com/karimsa/comms.svg?token=bynzkcTP4XciV8soPs5e&branch=master)](https://travis-ci.com/karimsa/comms)

Rapid &amp; secure communications module.

## Motivation

WebSockets are great but for a few projects that were extremly speed
sensitive, I needed something a bit better. So I created comms with
the following requirements in mind:

 - Must have an API very similar to WebSockets or the `net` module
 - Must be secure (use encryption, maybe not TLS level)
 - Must use UDP over TCP - data loss is okay.
 - Must compress JSON much further than it typically is (even for really small JSON objects).

 comms is a module that solves these needs for me. I hope it is
 of use to you as well.

# TL;DR

**Install:** `npm install --save comms`

**Server:**
```javascript
const server = require('comms')()

server.model('message', { message: 'string' })
server.on('message', ({ message }) => console.log('Received: %j', message)))

server.listen(8080, () => console.log('okay im ready'))
```

**Client:**
```javascript
const client = require('comms').client(8080, 'localhost')
client.on('ready', () => client.emit('message', { message: 'Hello, world' }))
```

## Usage

To install comms, you can use npm like so: `npm install --save comms`.

You can then use it in a way similar to `socket.io`. There are two moving parts:
the server and the client. Servers must declare models they use for communication
(which are statically typed) and then define routes that respond to those models.

For instance, to receive a single string called `superCoolMessage` in a model called message,
you would declare the model like so:

```javascript
const server = require('comms')()

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
const client = require('comms').client(8080, 'localhost')
client.on('ready', () =>
  client.emit('message', { superCoolMessage: 'im batman' })
)
```

The server should now print 'im batman' to the console.

## License

Licensed under MIT license.
Copyright &copy; 2017 Karim Alibhai.
const comms = require('../')
const sock = comms.client(8080, 'localhost')

sock.on('error', console.log)

sock.on('ready', () => {
  sock.emit('message', { message: 'Hello, world' })
})
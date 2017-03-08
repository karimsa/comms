const comms = require('../')
const server = comms()

server.on('error', console.log)
server.model('message', { message: 'string' })
server.on('message', ({ message }, { address, port }) =>
  console.log('%s:%s says "%s"', address, port, message)
)

server.listen(8080, () => console.log('Listening :8080'))
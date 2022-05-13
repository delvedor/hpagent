'use strict'

const fetch = require('node-fetch')
const test = require('ava')
const { testCaseMatrix, createServer, createProxy, SERVER_HOSTNAME, PROXY_HOSTNAME } = require('./utils')

testCaseMatrix.forEach(({ description, AgentUnderTest, secureServer, secureProxy }) => {
  test(`${description}`, async t => {
    const server = await createServer(secureServer)
    const proxy = await createProxy(secureProxy)
    server.on('request', (req, res) => res.end('ok'))

    const response = await fetch(`${secureServer ? 'https' : 'http'}://${SERVER_HOSTNAME}:${server.address().port}`, {
      agent: new AgentUnderTest({
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 256,
        maxFreeSockets: 256,
        scheduling: 'lifo',
        proxy: `${secureProxy ? 'https' : 'http'}://${PROXY_HOSTNAME}:${proxy.address().port}`
      })
    })

    t.is(await response.text(), 'ok')
    t.is(response.status, 200)

    server.close()
    proxy.close()
  })
})

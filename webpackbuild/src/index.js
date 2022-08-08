// import a from './a'
var a = require('./a')

console.log('build')

if (VERSION === '5fa3b9') {
  // console.log('global version')
  require('socks-proxy-agent')
}

a();
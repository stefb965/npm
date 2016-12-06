var auth = require('./auth')
var npm = require('./npm.js')
var log = require('npmlog')
var output = require('./utils/output.js')

module.exports = whoami

whoami.usage = 'npm whoami [--registry <registry>]\n(just prints username according to given registry)'

function whoami (args, silent, cb) {
  // FIXME: need tighter checking on this, but is a breaking change
  if (typeof cb !== 'function') {
    cb = silent
    silent = false
  }

  log.silly('whoami', 'getting auth creds')
  auth.auth(function (err, creds) {
    if (err) { return cb(err) }
    if (creds && creds.username) {
      if (!silent) output(creds.username)
      return process.nextTick(cb.bind(this, null, creds.username))
    } else if (creds && creds.token) {
      return npm.registry.whoami(creds.registry, {
        auth: creds
      }, function (er, username) {
        if (er && er.code !== 401 && er.code !== 403) { return cb(er) }
        if (er || !username) {
          log.warn('whoami', 'Your auth token is no longer valid. Please log in again.')
          return auth.reauth(function (err, creds) {
            if (err) { return cb(err) }
            // Try again. Users might have to try authenticating more than
            // once.
            whoami(args, silent, cb)
          })
        }

        if (!silent) output(username)
        return cb(null, username)
      })
    } else {
      log.warn('whoami', 'Not logged in.')
      return auth.reauth(function (err, creds) {
        if (err) { return cb(err) }
        whoami(args, silent, cb)
      })
    }
  })
}

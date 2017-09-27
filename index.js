const _ = require('lodash')
const async = require('async')
const cheerio = require('cheerio')
const request = require('request')
const twilio = require('twilio')

const SITE_URL = 'http://www.geopeitus.ee/'

const signature = (treasure) => treasure.date + " | " + treasure.name 

const extractTreasureInformation = (node, $) => {
  const keys = ['date', 'name', 'rating', 'size', 'county']
  const values = node.find('td').get().map((el) => $(el).text().trim())
  return _.zipObject(keys, values)
}

const getCurrentTreasureList = (callback) => {
  request(SITE_URL, function (error, response, html) {
    if (error || response.statusCode != 200) {
      error = error || new Error(`Site responded with a non-200 status code: ${response.statusCode}`)
      return callback(error)
    }
    const $ = cheerio.load(html)
    const treasures = $('#t-content > table')
      .first()
      .find("tr")
      .get()
      .map((el) => extractTreasureInformation($(el), $))

    console.log(treasures)
    callback(null, treasures)
  })
}

const seenTreasureSignatures = (ctx, callback) => ctx.storage.get(callback)

const buildMessage = (ctx, treasure) => {
  return {
    from: ctx.secrets.TWILIO_NUMBER,
    to: ctx.secrets.TARGET_PHONE_NUMBER,
    body: `Uus geopeituse aare: ${treasure.name} (${treasure.size}, ${treasure.rating}, ${treasure.county})`
  }
}

const notifyNewTreasures = (ctx, treasures, seenTreasureSignatures, callback) => {
  if (_.isEmpty(seenTreasureSignatures)) {
    console.log('First run, storing treasure list and not notifying.')
    return callback()
  }
  const newTreasures = treasures.filter((t) => !_.includes(seenTreasureSignatures, signature(t)))
  console.log(`Notifying via sms of ${newTreasures.length} new treasures.`, {newTreasures})
  
  client = new twilio(ctx.secrets.TWILIO_SMS_AUTH_SID, ctx.secrets.TWILIO_SMS_AUTH_TOKEN)
  messages = newTreasures.map((treasure) => buildMessage(ctx, treasure))
  tasks = messages.map((message) => (cb) => client.messages.create(message, cb))
  
  async.series(tasks, callback)
}

const storeNewTreasures = (ctx, treasures, notifications, callback) => {
  const signatures = treasures.map(signature)
  ctx.storage.set(signatures, {force: true}, callback)
}

module.exports = (ctx, callback) => {
  async.autoInject({
    ctx: (callback) => callback(null, ctx),
    treasures: getCurrentTreasureList,
    seenTreasureSignatures: seenTreasureSignatures,
    notifications: notifyNewTreasures,
    store: storeNewTreasures
  }, (err, results) => callback(null, {err, notifications: results.notifications}))
}

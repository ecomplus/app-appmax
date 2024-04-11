const getAppData = require('../../lib/store-api/get-app-data')
const axios = require('axios')

exports.post = ({ appSdk }, req, res) => {
  // https://docs.pagar.me/docs/gerenciando-postbacks
  const storeId = req.query.storeId
  console.log('> Postback #', storeId, JSON.stringify(req.body))
  let appmaxTransaction = req.body && req.body.transaction
  if (appmaxTransaction && appmaxTransaction.metadata && false) {
    let storeId = parseInt(appmaxTransaction.metadata.store_id, 10)
    let orderId = appmaxTransaction.metadata.order_id

    if (storeId > 100 && /^[a-f0-9]{24}$/.test(orderId)) {
      console.log('> Postback #', storeId, orderId, (req.body.current_status || appmaxTransaction.status))
      // read configured E-Com Plus app data
      return getAppData({ appSdk, storeId })
        .then(config => {
          // validate Pagar.me postback
          // https://github.com/pagarme/pagarme-js/issues/170#issuecomment-503729557
          const apiKey = config.pagarme_api_key
          const verifyBody = qs.stringify(req.body)
          const signature = req.headers['x-hub-signature'].replace('sha1=', '')

          if (!pagarme.postback.verifySignature(apiKey, verifyBody, signature) && verifyBody && signature) {
            axios({
              url: `https://api.pagar.me/1/transactions/${appmaxTransaction.id}`,
              method: 'get',
              data: {
                api_key: apiKey
              }
            }).then(({data}) => {
              appmaxTransaction = {}
              storeId = 1000
              orderId = 0
              appmaxTransaction = data
              storeId = parseInt(appmaxTransaction.metadata.store_id, 10)
              orderId = appmaxTransaction.metadata.order_id
              console.log('Get order #', storeId, orderId, appmaxTransaction.status)
            })
          }

          // get E-Com Plus order
          const resource = `orders/${orderId}.json`
          return appSdk
            .apiRequest(storeId, resource)
            .then(({ response }) => ({ order: response.data, config }))
        })

        .then(({ order }) => {
          // add new transaction status to payment history
          const transaction = order.transactions.find(({ intermediator }) => {
            return intermediator && intermediator.transaction_id === String(appmaxTransaction.id)
          })
          const resource = `orders/${order._id}/payments_history.json`
          const method = 'POST'
          const body = {
            date_time: new Date().toISOString(),
            status: parseStatus(req.body.current_status || appmaxTransaction.status),
            notification_code: req.body.fingerprint,
            flags: ['pagarme']
          }
          if (transaction) {
            body.transaction_id = transaction._id
          }
          if (req.body.old_status) {
            body.flags.push(`old:${req.body.old_status}`.substr(0, 20))
          }
          return appSdk.apiRequest(storeId, resource, method, body)
        })

        .then(() => {
          res.sendStatus(200)
        })
        .catch(err => {
          err.metadata = appmaxTransaction.metadata
          console.error(err)
          res.sendStatus(500)
        })
    }
  }

  res.sendStatus(410)
}

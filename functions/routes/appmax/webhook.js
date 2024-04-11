const getAppData = require('../../lib/store-api/get-app-data')
const parseStatus = require('../../lib/payments/parse-status')
const axios = require('axios')

const findOrderByTransactionId = (appSdk, storeId, auth, transactionId) => {
  return new Promise((resolve, reject) => {
    appSdk.apiRequest(storeId, `orders.json?transactions.intermediator.transaction_id=${transactionId}`, 'GET', null, auth)
      .then(({ response }) => {
        resolve(response.data)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

exports.post = ({ appSdk }, req, res) => {
  // https://docs.pagar.me/docs/gerenciando-postbacks
  const { storeId, token } = req.query
  console.log('> Postback #', storeId, JSON.stringify(req.body))
  const appmaxTransaction = req.body
  if (appmaxTransaction && appmaxTransaction.data && appmaxTransaction.event) {
    if (storeId > 100) {
      // read configured E-Com Plus app data
      return appSdk.getAuth(storeId)
        .then(async (auth) => {
          // validate Appmax postback
          try {
            const appData = await getAppData({ appSdk, storeId, auth })
            if (token === appData.token) {
              const { id, status } = appmaxTransaction.data
              const orderRequest = await findOrderByTransactionId(appSdk, storeId, auth, id)
              if (orderRequest && Array.isArray(orderRequest.result) && orderRequest.result.length) {
                const order = orderRequest.result[0]
                const transaction = order.transactions.find(({ intermediator }) => {
                  return intermediator && intermediator.transaction_id === id
                })
                await appSdk.apiRequest(
                  storeId,
                  `orders/${order._id}/payments_history.json`,
                  'POST',
                  {
                    date_time: new Date().toISOString(),
                    status: parseStatus(status),
                    transaction_id: transaction._id,
                    flags: ['APPMAX, MGNR']
                  },
                  auth
                )
                res.status(200)
              }
            }
          } catch (error) {
            console.log('erro no update', error)
            res.status(400).send(error)
          }
        })
    }
  }

  res.sendStatus(410)
}

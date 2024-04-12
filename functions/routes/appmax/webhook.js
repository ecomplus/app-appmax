const getAppData = require('../../lib/store-api/get-app-data')
const parseStatus = require('../../lib/payments/parse-status')
const axios = require('axios')

const findOrderByTransactionId = (appSdk, storeId, auth, transactionId) => {
  return new Promise((resolve, reject) => {
    appSdk.apiRequest(storeId, `orders.json?transactions.intermediator.transaction_id=${transactionId}&fields=transactions,number,_id`, 'GET', null, auth)
      .then(({ response }) => {
        resolve(response.data)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

const validateStatus = function (status) {
  return status >= 200 && status <= 301
}

exports.post = ({ appSdk }, req, res) => {
  console.log('>>Webhook Pagaleve: ')
  const { body, query } = req
  // https://docs.pagar.me/docs/gerenciando-postbacks
  const storeId = Number(query.storeId)
  console.log('> Postback #', storeId, JSON.stringify(body))
  const appmaxTransaction = body
  if (appmaxTransaction && appmaxTransaction.data && appmaxTransaction.event) {
    if (storeId > 100) {
      return appSdk.getAuth(storeId)
        .then(async (auth) => {
          try {
              const appData = await getAppData({ appSdk, storeId, auth })
              const { id } = appmaxTransaction.data
              return axios.get(`https://admin.appmax.com.br/api/v3/order/${id}`, {
                params: {
                  'access-token': appData.token
                }
              }, {
                  maxRedirects: 0,
                  validateStatus
                }).then(async ({ data }) => {
                  console.log('order', JSON.stringify(data))
                  const status = data && data.data && data.data.status
                  console.log('status', status)
                  const orderRequest = await findOrderByTransactionId(appSdk, storeId, auth, id)
                  if (orderRequest && Array.isArray(orderRequest.result) && orderRequest.result.length) {
                    const order = orderRequest.result[0]
                    const transaction = order.transactions.find(({ intermediator }) => {
                      return intermediator && intermediator.transaction_id === id
                    })
                    if (transaction && transaction._id) {
                      const eventTreatement = appmaxTransaction.event === 'OrderChargeBackInTreatment' 
                        ? 'in_dispute'
                        : appmaxTransaction.event === 'OrderBilletOverdue'
                          ? 'voided'
                          : appmaxTransaction.event === 'OrderPixExpired'
                            ? 'voided'
                            : undefined


                      await appSdk.apiRequest(
                        storeId,
                        `orders/${order._id}/payments_history.json`,
                        'POST',
                        {
                          date_time: new Date().toISOString(),
                          status: eventTreatement || parseStatus(status),
                          transaction_id: transaction._id,
                          flags: ['APPMAX, MGNR']
                        },
                        auth
                      )
                      res.status(200)
                    }
                  }
                }).catch(err => {
                  console.log('couldnt get status', err)
                })
          } catch (error) {
              console.log('erro no update', error)
              res.status(400).send(error)
          }
        }).catch(err => {
          console.log('not logged', err)
        })
    }
  }

  res.sendStatus(410)
}

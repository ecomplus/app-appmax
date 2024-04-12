const getAppData = require('../../lib/store-api/get-app-data')
const parseStatus = require('../../lib/payments/parse-status')
const axios = require('axios')

const findOrderByTransactionId = (appSdk, storeId, auth, transactionId) => {
  return new Promise((resolve, reject) => {
    appSdk.apiRequest(storeId, `orders.json?transactions.intermediator.transaction_id=${transactionId}&fields=transactions,number,_id`, 'GET', null, auth)
      .then(({ response }) => {
        resolve(response.data && response.data.result && response.data.result.length && response.data.result[0])
      })
      .catch((err) => {
        reject(err)
      })
  })
}

const validateStatus = function (status) {
  return status >= 200 && status <= 301
}

exports.post = ({ appSdk, admin }, req, res) => {
  const { body, query } = req
  const storeId = Number(query.storeId)
  const appmaxTransaction = body
  console.log('>> Store: ', storeId, ' body: ', JSON.stringify(appmaxTransaction), ' <<')
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
            const status = data && data.data && data.data.status
            console.log('status', status)
            const order = await findOrderByTransactionId(appSdk, storeId, auth, id)
            if (order) {
              const transaction = order.transactions.find(({ intermediator }) => {
                return intermediator && intermediator.transaction_id === String(id)
              })
              if (transaction && transaction._id) {
                // update payment
                const transactionId = transaction._id
                const eventTreatement = appmaxTransaction.event === 'OrderChargeBackInTreatment' 
                      ? 'in_dispute'
                      : appmaxTransaction.event === 'OrderBilletOverdue'
                        ? 'voided'
                        : appmaxTransaction.event === 'OrderPixExpired'
                          ? 'voided'
                          : undefined
                return appSdk.apiRequest(
                  storeId,
                  `orders/${order._id}/payments_history.json`,
                  'POST',
                  {
                    date_time: new Date().toISOString(),
                    status: eventTreatement || parseStatus(status),
                    transaction_id: transactionId,
                    flags: ['APPMAX, MGNR']
                  },
                  auth
                ).then(({ data }) => {
                    console.log('>> Updated order <<', order._id)
                    res.status(200).send('ok')
                  })
                  .catch(error => {console.log('erro na atualização', error)})
                }
            } else {
                console.log('não encontrou pedido')
                res.status(400).send({
                  error: 'não encontrou o pedido'
                })
            } 
          })
          .catch(error => {console.log('erro pra buscar status', error); throw error})
        } catch (error) {
          console.error(error)
          const { response, config } = error
          let status
          if (response) {
            status = response.status
            const err = new Error(`#${storeId} APPMAX Webhook error ${status}`)
            err.url = config && config.url
            err.status = status
            err.response = JSON.stringify(response.data)
            console.error(err)
          }
          if (!res.headersSent) {
            res.send({
              status: status || 500,
              msg: `#${storeId} APPMAX Webhook error`
            })
          }
        }
      })
      .catch(() => {
        console.log('Unauthorized')
        if (!res.headersSent) {
          res.sendStatus(401)
        }
      })
  } else {
    return res.send({
      status: 404,
      msg: `StoreId #${storeId} not found`
    })
  }
}

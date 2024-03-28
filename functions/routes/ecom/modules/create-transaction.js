const axios = require('axios')
const addInstallments = require('../../../lib/payments/add-installments')
const parseStatus = require('../../../lib/payments/parse-status')
const getCustomer = require('../../../lib/appmax/customer')
const createOrder = require('../../../lib/appmax/order')

exports.post = async ({ appSdk }, req, res) => {
  // https://apx-mods.e-com.plus/api/v1/create_transaction/schema.json?store_id=100
  let baseUri = 'https://homolog.sandboxappmax.com.br/api/v3/payment/credit-card'
  const { params, application } = req.body
  const { storeId } = req
  const config = Object.assign({}, application.data, application.hidden_data)
  const { token } = config
  const orderId = params.order_id
  const { amount, buyer, to, items, browser_ip, utm } = params
  console.log('> Transaction #', storeId, orderId)
  const quantityItems = items.reduce((previous, currentValue) => previous + currentValue.quantity, 0)
  const customerId = await getCustomer(buyer, to, items, browser_ip, utm, token)
  const orderAppmaxId = await createOrder(items, amount, customerId, token)

  // https://apx-mods.e-com.plus/api/v1/create_transaction/response_schema.json?store_id=100
  const transaction = {
    amount: amount.total
  }

  const appmaxTransaction = {
    "access-token": token,
    "cart": {
      "order_id": orderAppmaxId
    },
    "customer": {
      "customer_id": customerId
    }
  }

  if (params.payment_method.code === 'credit_card') {
    let installmentsNumber = params.installments_number
    appmaxTransaction.payment = {
      "CreditCard": {
        "token": params.credit_card && params.credit_card.hash,
        "document_number": buyer.doc_number,
        "installments": installmentsNumber,
        "soft_descriptor": config.soft_descriptor || (`${params.domain}_APPMAX`).substr(0, 13)
      }
    }
  } else if (params.payment_method.code === 'account_deposit') {
    baseUri = 'https://homolog.sandboxappmax.com.br/api/v3/payment/pix'
    const pixConfig = config.account_deposit
    const dueTime = pixConfig.due_time || 60
    const currentDate = new Date()
    const timeZoneOffset = currentDate.getTimezoneOffset()
    const date = new Date(currentDate.getTime() + (dueTime * 60000) - (timeZoneOffset * 60000))
    appmaxTransaction.payment = {
      "pix": {
        "document_number": buyer.doc_number,
        "expiration_date": date.toISOString().slice(0, 19).replace('T', ' '),
      }
    }
  } else {
    // banking billet
    baseUri = 'https://homolog.sandboxappmax.com.br/api/v3/payment/boleto'
    transaction.banking_billet = {}
    appmaxTransaction.payment = {
      "Boleto": {
        "document_number": buyer.doc_number
      }
    }

    const boleto = config.banking_billet
    if (boleto) {
      if (boleto.instructions) {
        appmaxTransaction.boleto_instructions = boleto.instructions
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .substr(0, 255)
        transaction.banking_billet.text_lines = [appmaxTransaction.boleto_instructions]
      }
    }
  }

  // https://docs.pagar.me/reference#criar-transacao
  if (quantityItems > 0) {
    axios({
      url: baseUri,
      method: 'post',
      data: appmaxTransaction
    })
      .then((response) => {
        console.log('result payment', JSON.stringify(response.data))
        const data = response && response.data && response.data.data
        if (data && response.data.status === 200) {
          const paymentMethod =  data.type === 'Boleto'
            ? 'banking_billet'
            : data.type === 'CreditCard'
              ? 'credit_card'
              : 'account_deposit'
          
          transaction.intermediator = {
            payment_method: {
              code: paymentMethod || params.payment_method.code
            }
          }

          ;[
            ['pay_reference', 'transaction_code'],
            ['pay_reference', 'transaction_reference']
          ].forEach(([dataField, transactionField]) => {
            if (data[dataField]) {
              transaction.intermediator[transactionField] = String(data[dataField])
            }
          })
          transaction.intermediator['transaction_id'] = String(orderAppmaxId)
          transaction.intermediator.buyer_id = String(customerId)
          if (transaction.banking_billet) {
            if (data.boleto_payment_code) {
              transaction.banking_billet.code = data.boleto_payment_code
            }
            if (data.pdf) {
              transaction.payment_link = transaction.banking_billet.link = data.pdf
            }
            if (data.due_date) {
              transaction.banking_billet.valid_thru = new Date(data.due_date).toISOString()
            }
          } else if (data.card) {
            transaction.credit_card = {
              holder_name: data.card.holder_name,
              last_digits: data.card.last_digits,
              company: data.card.brand,
              token: data.card.fingerprint
            }
          } else if (paymentMethod === 'account_deposit') {
            const qrCode = data.pix_qr_code
            transaction.intermediator.transaction_code = qrCode
            const qrCodeSrc = `https://gerarqrcodepix.com.br/api/v1?brcode=${qrCode}&tamanho=256`
            transaction.notes = `<img src="${qrCodeSrc}" style="display:block;margin:0 auto">`
            if (data.pix_expiration_date) {
              transaction.account_deposit = {
                valid_thru: new Date(data.pix_expiration_date).toISOString()
              }
            }
          }
          transaction.status = {
            updated_at: data.date_created || data.date_updated || new Date().toISOString(),
            current: parseStatus(data.status)
          }
          res.send({ transaction })
        }
      })
  
      .catch(error => {
        console.log(error)
        // try to debug request error
        const errCode = 'APPMAX_TRANSACTION_ERR'
        let { message } = error
        const err = new Error(`${errCode} #${storeId} - ${orderId} => ${message}`)
        if (error.response) {
          const { status, data } = error.response
          if (status !== 401 && status !== 403) {
            err.payment = JSON.stringify(appmaxTransaction)
            err.status = status
            if (typeof data === 'object' && data) {
              err.response = JSON.stringify(data)
            } else {
              err.response = data
            }
          } else if (data && Array.isArray(data.errors) && data.errors[0] && data.errors[0].message) {
            message = data.errors[0].message
          }
        }
        console.error(err)
        res.status(409)
        res.send({
          error: errCode,
          message
        })
      })
  } else {
    res.status(400)
    res.send({
      error: 400,
      message: 'Doesnt have quantity to proceed'
    })
  }
}

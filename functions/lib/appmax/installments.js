const axios = require('axios')

const createInstallments = async (total, config, token) => {
  const body = {
    "access-token": token,
    installments: config.installments,
    total,
    format: 2
}

  const { data } = await axios({
    url: 'https://admin.appmax.com.br/api/v3/payment/installments',
    method: 'post',
    data: body
  })
  console.log('get installments', JSON.stringify(data))

  if (data && data.status === 200) {
    return data.data && data.data.id
  }
  return null
}

module.exports = createInstallments

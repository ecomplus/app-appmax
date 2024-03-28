const axios = require('axios')

const createInstallments = async (config, token) => {
  const body = {
}

  const { data } = await axios({
    url: 'https://admin.appmax.com.br/api/v3/payment/installments',
    method: 'post',
    data: body
  })
  console.log('created installments', JSON.stringify(data))

  if (data && data.status === 200) {
    return data.data && data.data.id
  }
  return null
}

module.exports = createInstallments

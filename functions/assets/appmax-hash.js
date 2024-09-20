;(function () {
  window._appmaxHash = function (cardClient) {
    return new Promise(function (resolve, reject) {
      window.axios({
        method: 'post',
        url: 'https://admin.appmax.com.br/api/v3/security/visitor',
        data: {
          public_key: window._appmaxKey,
          card: {
            number: cardClient.number,
            name: cardClient.name,
            month: cardClient.month,
            year: cardClient.year,
            cvv: cardClient.cvc
          }
        }
      })
        .then(function ({ data }) {
          resolve(data.data.token)
        })
        .catch(reject)
    })
  }
}())

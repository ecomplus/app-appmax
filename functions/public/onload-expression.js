; (function () {
  const token = window._appmaxKey
  const storeId = window.storefront && window.storefront.settings && window.storefront.settings.store_id 
  window._appmaxHash = async function (cardClient) {
    return new Promise(async function (resolve, reject) {
      const card = {
        number: cardClient.number,
        name: cardClient.name,
        month: cardClient.month,
        year: cardClient.year,
        cvv: cardClient.cvc
      }

      const resp = await fetch(
        'https://admin.appmax.com.br/api/v3/security/visitor',
        {
          headers: {
            'Content-Type': 'application/json'
          },
          method: 'POST',
          body: JSON.stringify({
            'public_key': token,
            card
          })
        }
      )

      try {
        const { data } = await resp.json()
        console.log('token', data)
        if (data.data) {
          resolve(data.data.token)
        }
        throw new Error('Credencial inválida')
      } catch (err) {
        console.log('credencial inválida')
        // console.error(err)
        reject(err)
      }
    })
  }
}())

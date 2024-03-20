; (function () {
  const token = window._pagarmeKey
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
        'https://homolog.sandboxappmax.com.br/api/v3/payment/credit-card',
        {
          headers: {
            'Content-Type': 'application/json'
          },
          method: 'POST',
          body: JSON.stringify({
            'access-token': 'token',
            card
          })
        }
      )

      try {
        const data = await resp.json()
        if (data.id) {
          resolve(data.id)
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

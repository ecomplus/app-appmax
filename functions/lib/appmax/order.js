const axios = require('axios')

const createOrder = async (items, amount, customer_id, token) => {
  const { total, discount, freight } = amount
  const products = []
  items.forEach(({sku, quantity, name, price, final_price}) => {
    if (quantity > 0) {
      products.push({
        sku,
        name,
        qty: quantity,
        price: final_price || price
      })
    }
  });
  const body = {
    "access-token": token,
    total,
    products,
    "shipping": freight,
    customer_id,
    discount
}

  const { data } = await axios({
    url: 'https://homolog.sandboxappmax.com.br/api/v3/order',
    method: 'post',
    data: body
  })
  console.log('created order', JSON.stringify(data))

  if (data && data.status === 200) {
    return data.data && data.data.id
  }
  return null
}

module.exports = createOrder

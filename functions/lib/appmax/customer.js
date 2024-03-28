const axios = require('axios')

const createOrUpdateCustomer = async (buyer, to, items, browser_ip, utm, token) => {
  const { email, fullname } = buyer
  const splitedName = fullname.split(' ')
  const products = []
  items.forEach(({sku, quantity}) => {
    if (quantity > 0) {
      products.push({
        product_sku: sku,
        product_qty: quantity
      })
    }
  });
  const body = {
    "access-token": token,
    "firstname": splitedName[0],
    "lastname": splitedName[splitedName.length - 1],
    email,
    "telephone": buyer.phone.number,
    "postcode": to.zip.replace(/\D/g, '').padStart(8, '0'),
    "address_street": to.street,
    "address_street_number": to.number ? String(to.number) : 'SN',
    "address_street_complement": to.complement,
    "address_street_district": to.borough,
    "address_city": to.city,
    "address_state": to.province || to.province_code,
    "ip": browser_ip,
    "custom_txt": items[0].name,
    products,
    "tracking": { 
      "utm_source": utm.source,
      "utm_campaign": utm.campaign,
      "utm_medium": utm.medium,
      "utm_content": utm.content,
      "utm_term": utm.content
    }
  }

  const { data } = await axios({
    url: 'https://appmax.com.br/api/v3/customer',
    method: 'post',
    data: body
  })
  console.log('created customer', JSON.stringify(data))

  if (data && data.status === 200) {
    return data.data && data.data.id
  }
  return null
}

module.exports = createOrUpdateCustomer

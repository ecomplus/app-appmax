;(function () {
  window._appmaxHash = function (cardClient) {
    return new Promise(function (resolve, reject) {
      fetch('https://admin.appmax.com.br/api/v3/security/visitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          public_key: window._appmaxKey,
          card: {
            number: cardClient.number,
            name: cardClient.name,
            month: cardClient.month,
            year: cardClient.year,
            cvv: cardClient.cvc
          }
        })
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(function (data) {
          resolve(data.data.token);
        })
        .catch(reject);
    });
  };
}());

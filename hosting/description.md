# AppMax

## A Melhor Tecnologia de Pagamentos para E-commerces e Negócios Digitais 

Maximize suas vendas online com a Appmax.
A única plataforma de pagamento que aprova em média 99% 
das suas vendas sem aumentar seu chargeback. 
Crie sua conta em 10 minutos e veja seu faturamento aumentar.

## Cadastro de Webhooks Appmax

Para que haja a atualização automática de _status_ dos pedidos, será necessário cadastrar ***Webhooks*** no ***Dashboard do Appmax***.

<a href=" https://docs.appmax.com.br/webhooks/" target="_blank">Referência do Appmax</a>

1. Navegue até: **Configurações > Webhooks**

2. Preencha os seguintes campos:
   - **URL Destino:**  
     `https://us-central1-ecom-appmax.cloudfunctions.net/app/appmax/webhook?storeId=SEU_STORE_ID_AQUI`

   - **Template do Webhook:**  
     `DefaultResponse`

   - **Eventos do Webhook:**  
     - Order Authorized
     - Order Billet Overdue
     - Order Integrated
     - Order Pending Integration
     - Order Refund
     - Payment Not Authorized

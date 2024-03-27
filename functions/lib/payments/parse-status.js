module.exports = appmaxStatus => {
  switch (appmaxStatus) {
    case 'processing':
    case 'analyzing':
      return 'under_analysis'
    case 'authorized':
    case 'paid':
    case 'refunded':
      return appmaxStatus
    case 'waiting_payment':
      return 'pending'
    case 'pending_refund':
      return 'in_dispute'
    case 'refused':
      return 'unauthorized'
    case 'chargedback':
      return 'refunded'
    case 'pending_review':
      return 'authorized'
  }
  return 'unknown'
}

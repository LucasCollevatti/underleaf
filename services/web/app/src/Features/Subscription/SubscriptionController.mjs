async function getRecommendedCurrency() {
  return {
    currency: 'USD',
    recommendedCurrency: 'USD',
    countryCode: undefined,
  }
}

export default {
  getRecommendedCurrency,
  promises: {
    getRecommendedCurrency,
  },
}

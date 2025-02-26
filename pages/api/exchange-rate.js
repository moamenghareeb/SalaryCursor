// Simple, reliable static response
export default function handler(req, res) {
  // Return exchange rate hardcoded with accurate value
  return res.status(200).json({
    exchangeRate: 50.3,
    source: 'static'
  });
} 
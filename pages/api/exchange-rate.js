// Simple, reliable static response
export default function handler(req, res) {
  // Return exchange rate hardcoded
  return res.status(200).json({
    exchangeRate: 31.5,
    source: 'static'
  });
} 
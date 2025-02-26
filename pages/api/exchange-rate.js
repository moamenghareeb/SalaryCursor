export default function handler(req, res) {
  // Return a hardcoded exchange rate for testing
  res.status(200).json({ exchangeRate: 31.5 });
} 
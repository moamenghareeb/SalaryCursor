// Simple, reliable static response
export default function handler(req, res) {
  // Set cache control headers to prevent caching
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  
  // Return exchange rate hardcoded with accurate value
  return res.status(200).json({
    exchangeRate: 50.3,
    source: 'static-updated-feb2024'
  });
} 
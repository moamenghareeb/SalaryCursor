export default async function handler(req, res) {
  try {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
    );
    
    const data = await response.json();
    
    // Get the EGP rate from the response
    const egpRate = data.conversion_rates.EGP;
    
    // Return the exchange rate
    res.status(200).json({ exchangeRate: egpRate });
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    res.status(500).json({ error: "Failed to fetch exchange rate" });
  }
} 
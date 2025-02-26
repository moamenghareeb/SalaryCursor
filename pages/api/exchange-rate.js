export default async function handler(req, res) {
  try {
    // Use the API key directly for now to debug
    const response = await fetch(
      "https://v6.exchangerate-api.com/v6/e8287e34bce27377331a738e/latest/USD"
    );
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("API Response:", data); // Debug log
    
    if (!data.conversion_rates || !data.conversion_rates.EGP) {
      throw new Error("EGP rate not found in API response");
    }
    
    // Get the EGP rate from the response
    const egpRate = data.conversion_rates.EGP;
    
    // Return the exchange rate
    res.status(200).json({ exchangeRate: egpRate });
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    res.status(500).json({ 
      error: "Failed to fetch exchange rate", 
      message: error.message 
    });
  }
} 
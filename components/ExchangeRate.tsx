import { useEffect, useState } from 'react';

export default function ExchangeRate() {
  const [rate, setRate] = useState<number>(31.50);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchRate = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/exchange-rate');
      const data = await response.json();
      
      if (data.rate) {
        setRate(data.rate);
        setLastUpdated(data.lastUpdated);
      }
    } catch (error) {
      console.error('Error fetching rate:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch rate when component mounts
  useEffect(() => {
    fetchRate();
  }, []);

  return (
    <div className="mb-4 sm:mb-6">
      <h2 className="text-lg font-semibold mb-2 px-4 sm:px-0">Current Exchange Rate</h2>
      <div className="bg-white p-4 rounded-lg shadow mx-4 sm:mx-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-2xl sm:text-lg font-medium">
              1 USD = <span className="font-bold text-green-600">{rate.toFixed(2)} EGP</span>
            </p>
            {lastUpdated && (
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
          {loading && (
            <div className="text-xs sm:text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded">
              Updating...
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
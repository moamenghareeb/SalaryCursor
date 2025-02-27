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
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-2">Current Exchange Rate</h2>
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg">
              1 USD = <span className="font-bold text-green-600">{rate.toFixed(2)} EGP</span>
            </p>
            {lastUpdated && (
              <p className="text-sm text-gray-500">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
          {loading && (
            <div className="text-sm text-gray-500">
              Updating...
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
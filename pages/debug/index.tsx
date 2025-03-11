import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/authContext';
import Layout from '../../components/Layout';
import axios from 'axios';

export default function DebugPage() {
  const { session } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDebugData = async () => {
    if (!session) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/debug/leave-audit', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      setData(response.data);
      console.log('Debug data:', response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch debug data');
      console.error('Debug error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Leave Data Debug</h1>
        
        <button
          onClick={fetchDebugData}
          className="px-4 py-2 bg-blue-500 text-white rounded mb-6"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Fetch Debug Data'}
        </button>
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {data && (
          <div className="space-y-6">
            <div className="p-4 bg-white shadow rounded">
              <h2 className="text-xl font-semibold mb-2">Leave Service Calculation</h2>
              <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-80 text-sm">
                {JSON.stringify(data.leaveServiceCalculation, null, 2)}
              </pre>
            </div>
            
            <div className="p-4 bg-white shadow rounded">
              <h2 className="text-xl font-semibold mb-2">Employee Record</h2>
              <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-80 text-sm">
                {JSON.stringify(data.employeeRecord, null, 2)}
              </pre>
            </div>
            
            <div className="p-4 bg-white shadow rounded">
              <h2 className="text-xl font-semibold mb-2">Raw In-Lieu Records ({data.rawInLieuRecords?.length || 0})</h2>
              <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-80 text-sm">
                {JSON.stringify(data.rawInLieuRecords, null, 2)}
              </pre>
            </div>
            
            <div className="p-4 bg-white shadow rounded">
              <h2 className="text-xl font-semibold mb-2">Raw Leave Records ({data.rawLeaveRecords?.length || 0})</h2>
              <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-80 text-sm">
                {JSON.stringify(data.rawLeaveRecords, null, 2)}
              </pre>
            </div>
            
            <div className="p-4 bg-white shadow rounded">
              <h2 className="text-xl font-semibold mb-2">Verification</h2>
              <div className="space-y-2">
                <div>
                  <strong>Base Balance:</strong> {data.leaveServiceCalculation.baseLeaveBalance}
                </div>
                <div>
                  <strong>In-Lieu Balance:</strong> {data.leaveServiceCalculation.inLieuBalance}
                </div>
                <div>
                  <strong>Leave Taken:</strong> {data.leaveServiceCalculation.leaveTaken}
                </div>
                <div>
                  <strong>Manual Calculation:</strong> {data.leaveServiceCalculation.baseLeaveBalance} + {data.leaveServiceCalculation.inLieuBalance} - {data.leaveServiceCalculation.leaveTaken} = {
                    Number(data.leaveServiceCalculation.baseLeaveBalance) + 
                    Number(data.leaveServiceCalculation.inLieuBalance) - 
                    Number(data.leaveServiceCalculation.leaveTaken)
                  }
                </div>
                <div>
                  <strong>Reported Remaining Balance:</strong> {data.leaveServiceCalculation.remainingBalance}
                </div>
                <div>
                  <strong>Employee Record Leave Balance:</strong> {data.employeeRecord?.leave_balance || 'N/A'}
                </div>
                <div>
                  <strong>Employee Record Annual Leave Balance:</strong> {data.employeeRecord?.annual_leave_balance || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 
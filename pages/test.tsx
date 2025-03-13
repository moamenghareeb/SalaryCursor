import React from 'react';
import Layout from '../components/Layout';

const TestPage: React.FC = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-black text-white p-6">
        <h1 className="text-5xl font-bold mb-6">Test Page</h1>
        <p>If you can see this page, Next.js routing is working correctly.</p>
      </div>
    </Layout>
  );
};

export default TestPage; 
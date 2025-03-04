import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Run the command to refresh the schema cache
    const { data, error } = await supabase.rpc('refresh_schema_cache');

    if (error) {
      console.error('Error refreshing schema cache:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, message: 'Schema cache refreshed successfully' });
  } catch (error) {
    console.error('Error in refresh-schema-cache API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
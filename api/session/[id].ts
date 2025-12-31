import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionStatus } from '../../src/functions';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const sessionId = Array.isArray(id) ? id[0] : id;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    const status = getSessionStatus(sessionId);
    
    return res.json({
      success: true,
      session: status
    });
  } catch (error) {
    console.error('[API] Error getting session status:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

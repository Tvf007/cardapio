import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('📥 Pages Router Sync endpoint called');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));

  // Apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Use POST method'
    });
  }

  try {
    console.log('Body:', JSON.stringify(req.body, null, 2));

    return res.status(200).json({
      success: true,
      message: 'Pages Router Sync Works!',
      router: 'Pages Router',
      time: new Date(),
      method: req.method,
      receivedData: req.body
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

const METAFORGE_API_URL = 'https://metaforge.app/api/arc-raiders/events-schedule';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(METAFORGE_API_URL);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Upstream API error: ${response.status}`,
      });
    }

    const data = await response.json();

    // Cache for 10 minutes, allow stale for 30 minutes while revalidating
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');

    return res.status(200).json(data);
  } catch (error) {
    console.error('Failed to fetch from Metaforge:', error);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
}

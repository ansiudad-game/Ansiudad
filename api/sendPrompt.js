// Compatibility adapter for the current Vercel deployment and Vite development.
import { generateGame } from '../server/generateGame.js';

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    const result = await generateGame(req.body, process.env);
    return res.status(result.status).json(result.body);
}

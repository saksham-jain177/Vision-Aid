
import fetch from 'node-fetch';

export default async function handler(req, res) {
    // CORS handling - restrict to production domain
    const allowedOrigins = [
        'https://vision-aid-cyan.vercel.app',
        'http://localhost:3000', // Allow local development
    ];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Accept'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!OPENROUTER_API_KEY) {
        console.error('❌ OPENROUTER_API_KEY is not set');
        return res.status(500).json({ error: { message: 'Server configuration error' } });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: { message: 'Method not allowed' } });
    }

    // Input validation
    const { messages, model, max_tokens, temperature, top_p } = req.body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: { message: 'Invalid messages format' } });
    }

    if (!model || typeof model !== 'string') {
        return res.status(400).json({ error: { message: 'Invalid model format' } });
    }

    // Validate message count (prevent extremely long conversations)
    if (messages.length > 25) {
        return res.status(400).json({ error: { message: 'Too many messages in conversation' } });
    }

    // Validate max_tokens (prevent credit drain attacks)
    const validatedMaxTokens = Math.min(max_tokens || 300, 500);

    // Validate temperature
    const validatedTemperature = Math.max(0, Math.min(temperature || 0.3, 1));

    // Validate top_p
    const validatedTopP = Math.max(0, Math.min(top_p || 0.9, 1));

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': req.headers.referer || 'https://vision-aid-cyan.vercel.app',
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: validatedMaxTokens,
                temperature: validatedTemperature,
                top_p: validatedTopP,
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: { message: 'Internal Server Error' } });
    }
}

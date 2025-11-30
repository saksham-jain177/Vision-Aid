
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = 3001;

// Global error handlers
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Simple CORS - allow localhost and production
app.use(cors({
    origin: ['http://localhost:3000', 'https://vision-aid-cyan.vercel.app'],
    credentials: true
}));

app.use(express.json({ limit: '1mb' }));

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY is not set in .env');
    process.exit(1);
}

console.log('🔑 API Key loaded successfully');

app.post('/api/chat', async (req, res) => {
    try {
        const { messages, model, max_tokens, temperature, top_p } = req.body;

        // Validate required fields
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: { message: 'Invalid messages format' } });
        }

        if (!model || typeof model !== 'string') {
            return res.status(400).json({ error: { message: 'Invalid model format' } });
        }

        // Validate message count
        if (messages.length > 25) {
            return res.status(400).json({ error: { message: 'Too many messages in conversation' } });
        }

        // Validate and cap max_tokens
        const validatedMaxTokens = Math.min(max_tokens || 300, 500);
        const validatedTemperature = Math.max(0, Math.min(temperature || 0.3, 1));
        const validatedTopP = Math.max(0, Math.min(top_p || 0.9, 1));

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': req.headers.referer || 'http://localhost:3000',
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
            console.error('OpenRouter error:', data);
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: { message: 'Internal Server Error' } });
    }
});

const server = app.listen(PORT, () => {
    console.log(`✅ Proxy server running on http://localhost:${PORT}`);
    console.log('🔄 Server is ready to accept connections...');
});

server.on('error', (error) => {
    console.error('❌ Server error:', error);
});

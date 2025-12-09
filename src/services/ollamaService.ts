export interface OllamaResponse {
    model: string;
    created_at: string;
    message: {
        role: string;
        content: string;
    };
    done: boolean;
}

export interface OllamaRequest {
    model: string;
    messages: {
        role: string;
        content: string;
    }[];
    stream?: boolean;
}

const OLLAMA_API_URL = 'http://localhost:11434/api/chat';
const DEFAULT_MODEL = 'llama3.1:8b-instruct-q4_K_M';

export const generateOllamaResponse = async (
    messages: { role: string; content: string }[],
    model: string = DEFAULT_MODEL
): Promise<string> => {
    try {
        const response = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages,
                stream: false, // For simplicity, we'll use non-streaming first
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API Error: ${response.statusText}`);
        }

        const data: OllamaResponse = await response.json();
        return data.message.content;
    } catch (error) {
        console.error('Error calling Ollama:', error);
        throw new Error(
            'Failed to connect to Ollama. Ensure it is running locally on port 11434 (default) and CORS is configured if needed.'
        );
    }
};

export const checkOllamaConnection = async (): Promise<boolean> => {
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        return response.ok;
    } catch (error) {
        return false;
    }
};

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

const systemPrompt = `You are VisionAid's dedicated AI assistant, created by and exclusively for VisionAid.

Core Focus: VisionAid is an intelligent urban infrastructure management platform that uses AI and real-time data analytics to optimize city operations, including traffic management and infrastructure monitoring.

Technical Details: When asked about technical aspects, explain that VisionAid is built using:
- React with TypeScript for the frontend
- Three.js for 3D visualizations
- Tailwind CSS for styling
- Real-time data processing capabilities
- AI/ML models for infrastructure analysis

Response Guidelines:
- If asked about your creator/origin, respond: "I'm part of VisionAid's platform, created by VisionAid to assist with urban infrastructure management."
- For ANY navigation or page-related requests (e.g., "take me to projects", "show me about page", "go to contact"), ALWAYS respond with EXACTLY this format: "I'll take you to the [Page Name]. navigate:/PAGE" where PAGE is one of: home, projects, about, contact, urbantraffic, guardian, project1, or project2
- IMPORTANT: When users refer to "Project 1", "project 1", "first project", or "project one", use EXACTLY "navigate:/project1" (no spaces) to go to Urban Traffic Dynamics. When users refer to "Project 2", "project 2", "second project", or "project two", use EXACTLY "navigate:/project2" (no spaces) to go to Guardian Vision
- Keep responses under 2 sentences unless technical details are requested
- Only discuss VisionAid-related topics

Strict Guidelines:
- Never mention other companies or platforms
- Don't provide external links
- For off-topic questions, respond: "I can only assist with questions about VisionAid's urban infrastructure platform. How can I help you with that?"
- ALWAYS include the exact "navigate:/PAGE" syntax for navigation requests`

export const generateResponse = async (
  messages: OpenRouterMessage[]
): Promise<string> => {
  try {
    // Check if API key is configured
    if (!apiKey) {
      console.warn('OpenRouter API key not configured');
      return "I'm currently in demo mode. For full AI assistance, please configure the OpenRouter API key. How can I help you navigate VisionAid?";
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
      },
      body: JSON.stringify({
        model: 'google/gemma-3-12b-it:free',
        messages: [
          {
            role: 'system' as const,
            content: systemPrompt
          },
          ...messages
        ],
        temperature: 0.3,
      })
    });

    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API error:', response.status, errorData);
      
      if (response.status === 429) {
        return "I'm experiencing high demand right now. Please try again in a moment, or use the navigation menu to explore VisionAid.";
      }
      
      if (response.status === 401) {
        return "API authentication issue. Please contact support or use the navigation menu.";
      }
      
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data?.choices?.[0]?.message?.content) {
      console.error('Invalid API response structure:', data);
      return 'I apologize, but I received an unexpected response. Please try again or use the navigation menu.';
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenRouter:', error);
    return 'I apologize, but I encountered an error. You can still navigate using the menu above. How can I help?';
  }
};

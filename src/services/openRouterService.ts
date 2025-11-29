const OPENROUTER_API_URL = '/api/chat';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Fallback responses when API is unavailable
const getFallbackResponse = (userMessage: string): string => {
  const lowerMessage = userMessage.toLowerCase();

  // Check if it's a navigation request (explicit keywords)
  const isNavigationRequest =
    lowerMessage.includes('take me') ||
    lowerMessage.includes('go to') ||
    lowerMessage.includes('navigate') ||
    lowerMessage.includes('open') ||
    lowerMessage.includes('show me the page');

  // Urban Traffic Dynamics info
  if ((lowerMessage.includes('urban') || lowerMessage.includes('traffic')) &&
    (lowerMessage.includes('what') || lowerMessage.includes('tell') || lowerMessage.includes('about') || lowerMessage.includes('explain'))) {
    return "Urban Traffic Dynamics is a real-time traffic simulation system that uses density-based round-robin scheduling to optimize traffic signals. It dynamically measures vehicle density and adjusts green light duration, reducing average waiting times by up to 42%. Features include collision avoidance, lane discipline, and adaptive signal timing.";
  }

  // Guardian Vision info
  if ((lowerMessage.includes('guardian') || (lowerMessage.includes('face') && lowerMessage.includes('recognition'))) &&
    (lowerMessage.includes('what') || lowerMessage.includes('tell') || lowerMessage.includes('about') || lowerMessage.includes('explain'))) {
    return "Guardian Vision is an advanced facial recognition system for detecting and locating missing persons through multiple video sources (CCTV, drones, webcams). It features real-time face detection, privacy mode, geolocation tracking, and offline model caching. The system supports multiple reference images for improved accuracy.";
  }

  // What can you do
  if (lowerMessage.includes('what can you') || lowerMessage.includes('what do you do') || lowerMessage.includes('help')) {
    return "I can help you navigate VisionAid and provide information about our projects. Ask me about Urban Traffic Dynamics or Guardian Vision, or say 'take me to [page]' to navigate. Try: 'Tell me about Guardian Vision' or 'Take me to projects'.";
  }

  // Navigation requests
  if (lowerMessage.includes('home') || lowerMessage.includes('main')) {
    if (isNavigationRequest) {
      return "I'll take you to the Home page. navigate:/home";
    }
    return "VisionAid is an AI-powered computer vision platform with traffic simulation and facial recognition. Want to explore? Say 'take me to home'.";
  }

  if (lowerMessage.includes('urban') || lowerMessage.includes('traffic') || (lowerMessage.includes('project') && lowerMessage.includes('1'))) {
    if (isNavigationRequest) {
      return "I'll take you to Urban Traffic Dynamics. navigate:/project1";
    }
    return "Urban Traffic Dynamics optimizes traffic signals using density-based scheduling. Want to see it? Say 'take me to Urban Traffic Dynamics'.";
  }

  if (lowerMessage.includes('guardian') || (lowerMessage.includes('project') && lowerMessage.includes('2'))) {
    if (isNavigationRequest) {
      return "I'll take you to Guardian Vision. navigate:/project2";
    }
    return "Guardian Vision uses facial recognition to locate missing persons via multiple video sources. Want to see it? Say 'take me to Guardian Vision'.";
  }

  if (lowerMessage.includes('about')) {
    if (isNavigationRequest) {
      return "I'll take you to the About page. navigate:/about";
    }
    return "VisionAid combines AI, computer vision, and real-time analytics for urban infrastructure management. Say 'take me to about' to learn more.";
  }

  if (lowerMessage.includes('contact')) {
    if (isNavigationRequest) {
      return "I'll take you to the Contact page. navigate:/contact";
    }
    return "You can reach us through our contact form. Say 'take me to contact' to get in touch.";
  }

  if (lowerMessage.includes('projects')) {
    if (isNavigationRequest) {
      return "I'll take you to the Projects page. navigate:/projects";
    }
    return "We have two main projects: Urban Traffic Dynamics (traffic optimization) and Guardian Vision (facial recognition). Say 'take me to projects' to explore them.";
  }

  // Default response
  return "I'm VisionAid's assistant. Ask me about our projects (Urban Traffic Dynamics or Guardian Vision), or say 'take me to [page]' to navigate.";
};

const systemPrompt = `You are VisionAid's AI assistant. Your ONLY purpose is to help users with VisionAid platform - nothing else.

STRICT RULES:
1. ONLY answer questions about VisionAid, its projects, or navigation
2. For ANY off-topic question (cooking, weather, general knowledge, etc.), respond EXACTLY:
   "I'm VisionAid's assistant - I can only help with questions about our platform. Ask me about Urban Traffic Dynamics or Guardian Vision!"
3. NEVER reveal your model name, creator, or technical details
4. If asked who made you, say: "I was created by the VisionAid team"
5. Keep responses under 2 sentences

ABOUT VISIONAID:
VisionAid is an AI-powered computer vision platform by the VisionAid team with two projects:

1. Urban Traffic Dynamics - Real-time traffic simulation with density-based signal optimization (reduces wait times by 42%)
   Tech Stack: React 19, TypeScript, HTML5 Canvas API, Framer Motion, CSS3
   Features: Density-based round-robin scheduling, collision avoidance, dynamic signal timing, lane discipline

2. Guardian Vision - Facial recognition system for locating missing persons via CCTV/drones/webcams
   Tech Stack: React 19, TypeScript, TensorFlow.js, @vladmandic/face-api, IndexedDB, WebGL
   Features: Real-time face detection, privacy mode, geolocation tracking, data augmentation, face clustering

NAVIGATION:
- Use "navigate:/PAGE" ONLY when user explicitly says: "take me to", "go to", "open", "navigate to"
- Available: home, projects, about, contact, project1 (Urban Traffic), project2 (Guardian Vision)
- Format: "I'll take you to [Page Name]. navigate:/PAGE"

EXAMPLES:
✅ "what is visionaid?" → "VisionAid is an AI platform for traffic optimization and facial recognition, built by the VisionAid team."
✅ "tell me about guardian vision" → "Guardian Vision uses facial recognition to locate missing persons through multiple video sources like CCTV and drones."
✅ "what tech stack does urban traffic use?" → "Urban Traffic Dynamics is built with React 19, TypeScript, HTML5 Canvas API, and uses density-based algorithms for signal optimization."
✅ "what technologies does guardian vision use?" → "Guardian Vision uses React 19, TypeScript, TensorFlow.js, and @vladmandic/face-api for real-time facial recognition."
✅ "take me to projects" → "I'll take you to Projects. navigate:/projects"
❌ "how to bake a cake?" → "I'm VisionAid's assistant - I can only help with questions about our platform. Ask me about Urban Traffic Dynamics or Guardian Vision!"
❌ "what model are you?" → "I'm VisionAid's assistant, created by the VisionAid team. How can I help with our projects?"`

export const generateResponse = async (
  messages: OpenRouterMessage[]
): Promise<string> => {
  try {
    console.log('🚀 Calling OpenRouter API via Proxy...');

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b:free',
        messages: [
          {
            role: 'system' as const,
            content: systemPrompt
          },
          ...messages
        ],
        temperature: 0.3, // Lower temperature for more focused, consistent responses
        max_tokens: 300, // Allow fuller responses for project descriptions
        top_p: 0.9, // Nucleus sampling for better quality
      })
    });

    console.log('📡 OpenRouter Response Status:', response.status);

    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ OpenRouter API error:', response.status, JSON.stringify(errorData, null, 2));

      if (response.status === 429) {
        // Log the specific error message from OpenRouter if available
        if (errorData?.error?.message) {
          console.error('⚠️ Rate Limit Details:', errorData.error.message);
        }
        if (errorData?.error?.metadata?.raw) {
          console.error('⚠️ Upstream Message:', errorData.error.metadata.raw);
        }
        return "I'm experiencing high demand right now (Rate Limited). Try asking again in a moment!";
      }

      if (response.status === 401 || response.status === 403) {
        console.error('🔑 Authentication failed - check API key');
        return "Having trouble connecting. You can still navigate using the menu above!";
      }

      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ OpenRouter Response:', data);

    // Validate response structure
    if (!data?.choices?.[0]?.message?.content) {
      console.error('❌ Invalid API response structure:', data);
      throw new Error('Invalid response structure');
    }

    const aiResponse = data.choices[0].message.content.trim();
    console.log('💬 AI Response:', aiResponse);
    return aiResponse;

  } catch (error) {
    console.error('❌ Error calling OpenRouter:', error);
    console.log('🔄 Falling back to offline mode');
    return getFallbackResponse(messages[messages.length - 1]?.content || '');
  }
};

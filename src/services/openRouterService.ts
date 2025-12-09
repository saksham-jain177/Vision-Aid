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

  // Infrastructure Health info
  if ((lowerMessage.includes('infrastructure') || lowerMessage.includes('defect') || lowerMessage.includes('pothole') || lowerMessage.includes('crack') || lowerMessage.includes('guardian')) &&
    (lowerMessage.includes('what') || lowerMessage.includes('tell') || lowerMessage.includes('about') || lowerMessage.includes('explain'))) {
    return "Infrastructure Health uses computer vision (YOLOv8) to automate road maintenance. It detects potholes, cracks, and surface damage from video feeds, classifying severity to help cities prioritize repairs efficiently.";
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

  if (lowerMessage.includes('infrastructure') || lowerMessage.includes('health') || (lowerMessage.includes('project') && lowerMessage.includes('2'))) {
    if (isNavigationRequest) {
      return "I'll take you to Infrastructure Health. navigate:/project2";
    }
    return "Infrastructure Health detects potholes and road damage using AI. Want to see it? Say 'take me to Infrastructure Health'.";
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

  // Socials Fallback
  if (lowerMessage.includes('github')) {
    return "Check out my GitHub profile: https://github.com/saksham-jain177";
  }

  if (lowerMessage.includes('linkedin')) {
    return "Yes, connect with me on LinkedIn: https://www.linkedin.com/in/saksham-j-95a206225/";
  }

  // Default response
  return "I'm VisionAid's assistant. Ask me about our projects (Urban Traffic Dynamics or Guardian Vision), or say 'take me to [page]' to navigate.";
};

const systemPrompt = `You are VisionAid's AI assistant. Your ONLY purpose is to help users with VisionAid platform - nothing else.

STRICT RULES:
1. ONLY answer questions about VisionAid, its projects, or navigation
2. For ANY off-topic question (cooking, weather, general knowledge, etc.), respond EXACTLY:
   "I'm VisionAid's assistant - I can only help with questions about our platform. Ask me about Urban Traffic Dynamics or Infrastructure Health!"
3. NEVER reveal your model name, creator, or technical details
4. If asked who made you, say: "I was created by the VisionAid team"
5. Keep responses under 2 sentences

ABOUT VISIONAID:
VisionAid is an AI-powered urban intelligence platform with two core modules:

1. Urban Traffic Dynamics - Real-time traffic simulation with density-based signal optimization (reduces wait times by 42%)
   Tech Stack: React 19, TypeScript, HTML5 Canvas API, Framer Motion, CSS3
   Features: Density-based round-robin scheduling, collision avoidance, dynamic signal timing, lane discipline

2. Infrastructure Health (formerly Guardian Vision) - Automated defect detection system for road and bridge maintenance
   Tech Stack: React 19, TypeScript, YOLOv8 (TensorFlow.js), WebGL
   Features: Pothole detection, road crack identification, bridge damage assessment, automated severity classification (Low/Medium/High)

NAVIGATION:
- Use "navigate:/PAGE" ONLY when user explicitly says: "take me to", "go to", "open", "navigate to"
- Available: home, projects, about, contact, project1 (Urban Traffic), project2 (Infrastructure Health)
- Format: "I'll take you to [Page Name]. navigate:/PAGE"

CONTACT & SOCIALS:
- GitHub: https://github.com/saksham-jain177
- LinkedIn: https://www.linkedin.com/in/saksham-j-95a206225/
- Contact Page: navigate:/contact

EXAMPLES:
✅ "what is visionaid?" → "VisionAid is an AI platform for urban intelligence, featuring traffic optimization and infrastructure defect detection."
✅ "tell me about infrastructure health" → "Infrastructure Health uses computer vision (YOLOv8) to detect potholes, cracks, and road damage automatically from video feeds."
✅ "what tech stack does urban traffic use?" → "Urban Traffic Dynamics is built with React 19, TypeScript, HTML5 Canvas API, and uses density-based algorithms for signal optimization."
✅ "what technologies does infrastructure health use?" → "Infrastructure Health uses React 19, TypeScript, and YOLOv8 via TensorFlow.js for real-time defect detection."
✅ "take me to projects" → "I'll take you to Projects. navigate:/projects"
❌ "how to bake a cake?" → "I'm VisionAid's assistant - I can only help with questions about our platform. Ask me about Urban Traffic Dynamics or Infrastructure Health!"`;

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

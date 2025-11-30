import { pipeline, env } from '@xenova/transformers';
import nlp from 'compromise';
import levenshtein from 'fast-levenshtein';

// Configure to use CDN
env.allowLocalModels = false;
env.useBrowserCache = true;
// Force the path to be empty so it doesn't prepend /
env.localModelPath = 'https://huggingface.co/models/';

// Lazy-load the model
let featureExtractor: any = null;
let modelLoadingPromise: Promise<any> | null = null;

async function getFeatureExtractor() {
    if (featureExtractor) return featureExtractor;

    if (!modelLoadingPromise) {
        console.log('Loading semantic model...');
        modelLoadingPromise = (async () => {
            try {
                // Add a timeout race
                const loadPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                    quantized: true,
                    // @ts-ignore
                    local_files_only: false,
                });

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Model load timeout')), 15000)
                );

                featureExtractor = await Promise.race([loadPromise, timeoutPromise]);
                console.log('✔️ Model loaded successfully');
                return featureExtractor;
            } catch (error) {
                console.error('❌ Model load failed:', error);
                modelLoadingPromise = null;
                throw error;
            }
        })();
    }

    return modelLoadingPromise;
}

// Compute cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}

// Get embedding
async function getEmbedding(text: string): Promise<number[]> {
    const extractor = await getFeatureExtractor();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

// Intent templates - Strictly separated by intent type
const NAVIGATION_TEMPLATES = [
    "navigate to the page",
    "go to the section",
    "open the page",
    "take me to the page",
    "show me the page",
    "move to the section",
    "switch to the page",
    "visit the page",
];

const QUESTION_TEMPLATES = [
    "tell me about the project",
    "what is this",
    "explain the features",
    "how does it work",
    "describe the functionality",
    "give me information",
    "I want to know about",
    "who created this",
];

// Cache embeddings
let navigationEmbedding: number[] | null = null;
let questionEmbedding: number[] | null = null;

async function initializeTemplateEmbeddings() {
    if (!navigationEmbedding) {
        const navTexts = NAVIGATION_TEMPLATES.join(' ');
        const qTexts = QUESTION_TEMPLATES.join(' ');

        navigationEmbedding = await getEmbedding(navTexts);
        questionEmbedding = await getEmbedding(qTexts);
    }
}

// Extract page name with fuzzy matching (Backup for semantic)
export function extractPageFromNavIntent(text: string): string | null {
    const tokens = text.toLowerCase().split(/\s+/);
    const pages = ['home', 'projects', 'about', 'contact', 'urban', 'traffic', 'guardian', 'vision'];

    // Synonyms map
    const synonyms: Record<string, string> = {
        'work': 'projects',
        'portfolio': 'projects',
        'built': 'projects',
        'apps': 'projects',
        'info': 'about',
        'details': 'about',
        'mail': 'contact',
        'email': 'contact',
    };

    // 0. Check synonyms first
    for (const token of tokens) {
        if (synonyms[token]) return synonyms[token];
    }

    // 1. Exact match
    for (const page of pages) {
        if (text.toLowerCase().includes(page)) return page;
    }

    // 2. Fuzzy match
    for (const token of tokens) {
        for (const page of pages) {
            const distance = levenshtein.get(token, page);
            const maxDistance = page.length > 5 ? 2 : 1;
            if (distance <= maxDistance) return page;
        }
    }

    return null;
}

export interface IntentResult {
    isNavigation: boolean;
    confidence: number;
}

export async function detectIntent(userInput: string): Promise<IntentResult> {
    try {
        // 1. Try Semantic Detection (Transformers)
        await initializeTemplateEmbeddings();

        const userEmbedding = await getEmbedding(userInput.toLowerCase());
        const navSimilarity = cosineSimilarity(userEmbedding, navigationEmbedding!);
        const questionSimilarity = cosineSimilarity(userEmbedding, questionEmbedding!);

        console.log(`Semantic scores - Nav: ${navSimilarity.toFixed(3)}, Question: ${questionSimilarity.toFixed(3)}`);

        // Semantic check:
        // 1. Nav score must be higher than Question score
        // 2. Nav score must be reasonably high (> 0.25)
        // 3. The GAP between Nav and Question must be significant (> 0.02) to avoid ambiguity
        if (navSimilarity > questionSimilarity && navSimilarity > 0.25 && (navSimilarity - questionSimilarity) > 0.02) {
            return { isNavigation: true, confidence: navSimilarity };
        }

        // 2. Fallback to Keyword/Fuzzy (if semantic is unsure)
        const page = extractPageFromNavIntent(userInput);
        if (page) {
            // Only fallback if it explicitly looks like a command
            const navVerbs = ['go', 'take', 'show', 'navigate', 'visit', 'open', 'see'];
            if (navVerbs.some(v => userInput.toLowerCase().includes(v))) {
                console.log('Fallback to keyword detection');
                return { isNavigation: true, confidence: 1.0 };
            }
        }

        return { isNavigation: false, confidence: questionSimilarity };

    } catch (error) {
        console.warn('❌ Semantic detection failed, using fallback:', error);

        // Fallback: Keyword + Fuzzy
        const page = extractPageFromNavIntent(userInput);
        const navVerbs = ['go', 'take', 'show', 'navigate', 'visit', 'open', 'see'];
        const hasNavVerb = navVerbs.some(v => userInput.toLowerCase().includes(v));

        return {
            isNavigation: !!(page && hasNavVerb),
            confidence: 0.5
        };
    }
}

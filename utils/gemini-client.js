// ReviewSpy AI - Gemini Client with Dynamic Model Discovery & Strict JSON Output Mode
export class GeminiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.cachedModel = null;
  }

  // Dynamically discovers the active Flash models enabled for this API Key
  async resolveModel() {
    if (this.cachedModel) return this.cachedModel;

    try {
      console.log('[ReviewSpy] Querying ModelService.ListModels to detect active model...');
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
      if (res.ok) {
        const data = await res.json();
        const models = data.models || [];
        const contentModels = models.filter(m =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent')
        );

        // Priority order: latest fast Flash models
        const priorityPatterns = [
          /gemini-3\.8-flash/i,
          /gemini-3\.[0-9]+-flash/i,
          /gemini-3-flash/i,
          /gemini-3/i,
          /gemini-2\.5-flash/i,
          /gemini-2\.0-flash/i,
          /flash/i
        ];

        for (const pattern of priorityPatterns) {
          const match = contentModels.find(m => pattern.test(m.name));
          if (match) {
            const resolved = match.name.replace(/^models\//, '');
            console.log(`[ReviewSpy] Successfully resolved active Gemini model: ${resolved}`);
            this.cachedModel = resolved;
            return resolved;
          }
        }
      }
    } catch (e) {
      console.warn('[ReviewSpy] ListModels discovery error, falling back to static list:', e);
    }

    // Default fallback in 2026
    this.cachedModel = 'gemini-3.8-flash';
    return this.cachedModel;
  }

  async analyzeReviews(productTitle, reviews) {
    if (!this.apiKey) {
      throw new Error('Gemini API Key is missing. Please add your key in the Settings tab.');
    }

    if (!reviews || reviews.length === 0) {
      throw new Error('No reviews provided to analyze.');
    }

    // Format reviews concisely to save tokens while keeping full sentiment context
    const reviewsText = reviews.slice(0, 75).map((r, idx) => {
      return `[Review ${idx + 1}] Rating: ${r.rating}/5 | Title: ${r.title} | Verified: ${r.verified ? 'Yes' : 'No'}\n"${r.body}"`;
    }).join('\n\n');

    const systemPrompt = `You are an elite E-commerce Product Research & Copywriting Analyst for US Amazon FBA and Shopify sellers.
Your mission is to perform deep competitor teardowns on customer reviews.

Analyze the customer reviews for the product: "${productTitle}".

You MUST return a pure, valid JSON object matching this exact schema:
{
  "summary": "2-3 sentences summarizing overall customer sentiment and product quality.",
  "satisfaction_rate": 85, // estimated percentage of happy buyers (0-100)
  "top_complaints": [
    {
      "title": "Short title of the flaw/issue",
      "severity": "high", // "high" | "medium" | "low"
      "evidence": "Direct quote or paraphrased proof from customer reviews",
      "fix": "Actionable way a competitor can build a better version of this product"
    }
  ],
  "feature_opportunities": [
    {
      "feature": "Missing feature or variation customers asked for",
      "why": "Customer pain point or desire this solves"
    }
  ],
  "what_customers_love": [
    "Key selling point or feature that received consistent praise"
  ],
  "marketing_hooks": [
    "High-converting ad headline or hook that exploits the competitor's biggest flaw"
  ]
}

Be brutally honest, specific, and actionable. Avoid vague fluff.`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemPrompt}\n\nHere are the customer reviews to analyze:\n\n${reviewsText}` }
          ]
        }
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.2
      }
    };

    // Candidate models to try in case of deprecation / 404
    const resolvedPrimary = await this.resolveModel();
    const candidateModels = Array.from(new Set([
      'gemini-3.8-flash',
      resolvedPrimary,
      'gemini-3.0-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash'
    ]));

    let lastError = null;

    for (let i = 0; i < candidateModels.length; i++) {
      const model = candidateModels[i];
      try {
        console.log(`[ReviewSpy] Calling Gemini API with model: ${model}...`);
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const message = errData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;

          // Self-healing: Extract any model recommended by Google in the error message
          const suggestedMatch = message.match(/use models\/([a-zA-Z0-9_.-]+)/i);
          if (suggestedMatch && suggestedMatch[1]) {
            const suggested = suggestedMatch[1];
            if (!candidateModels.includes(suggested)) {
              console.log(`[ReviewSpy] Self-healing: Google recommended ${suggested}, appending to queue.`);
              candidateModels.push(suggested);
            }
          }

          // If model is not found, deprecated, or no longer available, continue to next candidate
          const isModelUnavailable = response.status === 404 ||
            message.includes('not found') ||
            message.includes('not supported') ||
            message.includes('no longer available') ||
            message.includes('deprecated');

          if (isModelUnavailable) {
            console.warn(`[ReviewSpy] Model ${model} not available (${message}), trying next candidate...`);
            lastError = new Error(message);
            continue;
          }

          if (response.status === 400 || response.status === 403) {
            throw new Error(`Invalid Gemini API Key or permission denied: ${message}`);
          }

          throw new Error(`Gemini API Error: ${message}`);
        }

        const data = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!candidateText) {
          throw new Error('No analysis generated from Gemini API.');
        }

        // Parse and return JSON
        const parsedJson = JSON.parse(candidateText);
        this.cachedModel = model; // Cache working model
        return parsedJson;

      } catch (err) {
        // If it's an API key error, throw immediately
        if (err.message.includes('Invalid Gemini API Key')) {
          throw err;
        }
        lastError = err;
      }
    }

    throw lastError || new Error('All candidate Gemini models failed to generate content.');
  }
}

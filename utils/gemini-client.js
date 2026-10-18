// ReviewSpy AI - Gemini Client with Strict JSON Output Mode
export class GeminiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
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

    const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const message = errData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
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

    try {
      const parsedJson = JSON.parse(candidateText);
      return parsedJson;
    } catch (parseErr) {
      console.error('Failed to parse Gemini output:', candidateText);
      throw new Error('Received malformed JSON from AI model. Please retry.');
    }
  }
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    // Use Google Gemini API key from environment
    const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");

    if (!apiKey) {
      throw new Error("Google Gemini API key is not configured");
    }

    console.log("Received message:", message);

    const systemPrompt = `You are a specialized Tuberculosis (TB) medical information assistant. 

STRICT RULES:
1. ONLY answer questions related to tuberculosis (TB), including:
   - TB symptoms, diagnosis, treatment, prevention
   - TB types (latent vs active, pulmonary vs extrapulmonary)
   - TB transmission, contagiousness, risk factors
   - TB testing methods (X-rays, sputum tests, skin tests, blood tests)
   - TB medications and antibiotics
   - TB vaccination (BCG)
   - Chest X-ray analysis related to TB

2. If the question is NOT about TB or related medical topics:
   - Politely decline and say: "I'm specifically designed to help with tuberculosis (TB) related questions. Please ask me about TB symptoms, treatment, prevention, diagnosis, or testing."
   - DO NOT answer general medical questions unrelated to TB
   - DO NOT answer non-medical questions

3. Keep answers clear, accurate, and concise (2-4 sentences)
4. Always recommend consulting healthcare professionals for diagnosis and treatment
5. Be empathetic and supportive in your responses`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-latest:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nUser question: ${message}` }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Google Gemini API error:", response.status, errorText);
      throw new Error("Failed to get AI response");
    }

    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;

    console.log("AI response:", aiResponse);

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in tb-chat function:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

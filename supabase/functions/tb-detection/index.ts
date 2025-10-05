import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the Express API URL from environment variable
    const expressApiUrl = Deno.env.get('EXPRESS_API_URL');
    
    if (!expressApiUrl) {
      console.error('EXPRESS_API_URL not configured');
      return new Response(
        JSON.stringify({ 
          error: 'API not configured', 
          details: 'Please set EXPRESS_API_URL environment variable' 
        }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Forwarding request to Express API:', expressApiUrl);

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    
    // Forward the request to the Express API
    const formData = await req.formData();
    
    const response = await fetch(`${expressApiUrl}/tb-detection`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || '',
      },
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Express API error:', data);
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Detection successful:', data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in tb-detection function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

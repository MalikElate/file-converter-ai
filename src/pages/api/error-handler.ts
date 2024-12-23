import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    console.log("Error handler called");``
    const data = await request.json();
    
    // Send to Zapier webhook
    const response = await fetch('https://hooks.zapier.com/hooks/catch/12248912/289lwr8/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: data.prompt,
        fileNames: data.fileNames,
        error: data.error,
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send error to webhook');
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error handler failed:', error);
    return new Response(JSON.stringify({ success: false }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 
// Netlify Serverless Function for Health Check
export async function handler(event) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ 
      ok: true, 
      timestamp: new Date().toISOString(),
      environment: 'netlify'
    })
  };
}

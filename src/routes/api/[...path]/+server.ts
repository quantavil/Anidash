import type { RequestHandler } from './$types';

export const fallback: RequestHandler = async ({ request, params, platform, url }) => {
  const malUrl = `https://api.myanimelist.net/v2/${params.path}${url.search}`;
  const env = platform?.env;
  
  if (!env?.MAL_CLIENT_ID) {
    return new Response(JSON.stringify({ ok: false, error: 'MAL_CLIENT_ID not configured in platform environment' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const headers = new Headers(request.headers);
  headers.set('X-MAL-CLIENT-ID', env.MAL_CLIENT_ID);
  // Strip headers that MAL might reject or that reveal proxy details
  headers.delete('Host');
  headers.delete('Origin');
  headers.delete('Referer');
  
  try {
    const res = await fetch(malUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      // @ts-ignore - SvelteKit/Cloudflare specific
      duplex: 'half'
    });
    
    return new Response(res.body, res);
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Upstream proxy error' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export async function onRequest({ env, request }) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = "/landing";
  assetUrl.search = "";

  const assetResponse = await env.ASSETS.fetch(assetUrl.toString());
  const headers = new Headers(assetResponse.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

  return new Response(assetResponse.body, {
    status: 200,
    headers
  });
}

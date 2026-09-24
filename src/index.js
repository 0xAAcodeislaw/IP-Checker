const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'self'; connect-src 'self' https://myip.ipip.net https://api.ip.sb https://api.ipify.org; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

function withSecurityHeaders(response) {
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    secured.headers.set(name, value);
  }
  return secured;
}

function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return withSecurityHeaders(new Response(JSON.stringify(data), { ...init, headers }));
}

function clientDetails(request) {
  const cf = request.cf ?? {};
  return {
    ip: request.headers.get("CF-Connecting-IP"),
    city: cf.city ?? null,
    region: cf.region ?? null,
    country: cf.country ?? null,
    continent: cf.continent ?? null,
    postalCode: cf.postalCode ?? null,
    timezone: cf.timezone ?? null,
    asn: cf.asn ?? null,
    organization: cf.asOrganization ?? null,
    colo: cf.colo ?? null,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/ip") {
      if (request.method !== "GET") {
        return json(
          { error: "method_not_allowed" },
          { status: 405, headers: { Allow: "GET" } },
        );
      }
      return json(clientDetails(request));
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "not_found" }, { status: 404 });
    }

    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
};

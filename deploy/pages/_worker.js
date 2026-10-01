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

function json(data, init = {}, pretty = false) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("Access-Control-Allow-Origin", "*");
  const body = JSON.stringify(data, null, pretty ? 2 : 0) + (pretty ? "\n" : "");
  return withSecurityHeaders(new Response(body, { ...init, headers }));
}

function text(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "text/plain; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("Access-Control-Allow-Origin", "*");
  return withSecurityHeaders(new Response(data, { ...init, headers }));
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
    latitude: cf.latitude ?? null,
    longitude: cf.longitude ?? null,
    asn: cf.asn ?? null,
    organization: cf.asOrganization ?? null,
    colo: cf.colo ?? null,
  };
}

function commandLineDetails(request) {
  const details = clientDetails(request);
  const protocol = details.ip?.includes(":") ? "IPv6" : details.ip ? "IPv4" : null;
  const location =
    details.latitude != null && details.longitude != null
      ? `${details.latitude},${details.longitude}`
      : null;
  const organization = [
    details.asn ? `AS${details.asn}` : null,
    details.organization,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    ip: details.ip,
    version: protocol,
    city: details.city,
    region: details.region,
    country: details.country,
    continent: details.continent,
    loc: location,
    org: organization || null,
    postal: details.postalCode,
    timezone: details.timezone,
    colo: details.colo,
  };
}

function isCommandLineClient(request) {
  const userAgent = request.headers.get("User-Agent")?.toLowerCase() ?? "";
  return /(?:^|\s|\/)(?:curl|wget|httpie|python-requests|go-http-client|libwww-perl|powershell)(?:\/|\s|$)/.test(
    userAgent,
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const isReadRequest = request.method === "GET" || request.method === "HEAD";
    const commandLineResponse =
      url.pathname === "/json" ||
      (url.pathname === "/" && isCommandLineClient(request));

    if (commandLineResponse || url.pathname === "/api/ip") {
      if (!isReadRequest) {
        return json(
          { error: "method_not_allowed" },
          { status: 405, headers: { Allow: "GET, HEAD" } },
        );
      }
      const details =
        url.pathname === "/api/ip"
          ? clientDetails(request)
          : commandLineDetails(request);
      return json(details, { status: 200 }, commandLineResponse);
    }

    if (url.pathname === "/ip") {
      if (!isReadRequest) {
        return text("Method not allowed\n", {
          status: 405,
          headers: { Allow: "GET, HEAD" },
        });
      }
      const ip = request.headers.get("CF-Connecting-IP");
      return text(ip ? `${ip}\n` : "Unknown\n");
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "not_found" }, { status: 404 });
    }

    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
};

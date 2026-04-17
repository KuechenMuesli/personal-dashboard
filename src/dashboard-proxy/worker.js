export default {
	async fetch(request, env) {
		const allowedOrigins = [
			"https://dashboard.paul-simon.dev",
			"http://localhost:5173",
			"http://127.0.0.1:5173"
		];

		const requestOrigin = request.headers.get("Origin");
		let corsOrigin = "";

		if (allowedOrigins.includes(requestOrigin)) {
			corsOrigin = requestOrigin;
		} else if (requestOrigin) {
			return new Response("CORS Origin Not Allowed", { status: 403 });
		}

		const corsHeaders = {
			"Access-Control-Allow-Origin": corsOrigin || allowedOrigins[0],
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, api-key, x-proxy-secret",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		const url = new URL(request.url);
		const targetUrl = url.searchParams.get("target");

		if (!targetUrl) {
			return new Response("Missing target parameter", { status: 400, headers: corsHeaders });
		}

		try {
			const parsedTarget = new URL(targetUrl);
			const allowedTargetDomains = [
				"api.example.com",
				"api.anotherservice.com"
			];

			if (!allowedTargetDomains.includes(parsedTarget.hostname)) {
				return new Response("Target domain not allowed", { status: 403, headers: corsHeaders });
			}
		} catch (e) {
			return new Response("Invalid target URL format", { status: 400, headers: corsHeaders });
		}

		try {
			const fetchHeaders = new Headers();
			fetchHeaders.set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36");

			const contentType = request.headers.get("Content-Type");
			if (contentType) fetchHeaders.set("Content-Type", contentType);

			const apiKey = request.headers.get("api-key");
			if (apiKey) fetchHeaders.set("api-key", apiKey);

			const fetchOptions = {
				method: request.method,
				headers: fetchHeaders,
			};

			if (["POST", "PUT", "PATCH"].includes(request.method)) {
				fetchOptions.body = request.body;
			}

			const response = await fetch(targetUrl, fetchOptions);

			const responseHeaders = new Headers(response.headers);
			Object.entries(corsHeaders).forEach(([key, value]) => {
				if (value) responseHeaders.set(key, value);
			});

			responseHeaders.set("Content-Type", response.headers.get("Content-Type") || "application/json");

			return new Response(response.body, {
				status: response.status,
				headers: responseHeaders,
			});

		} catch (err) {
			return new Response(`Proxy Error: ${err.message}`, {
				status: 500,
				headers: corsHeaders
			});
		}
	},
};

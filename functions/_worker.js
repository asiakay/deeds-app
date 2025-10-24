export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Polyfill Response.json for compatibility
    if (!Response.json) {
      Response.json = (data, init = {}) =>
        new Response(JSON.stringify(data, null, 2), {
          headers: { "Content-Type": "application/json" },
          ...init,
        });
    }

    try {
      // Authentication endpoint
      if (url.pathname === "/api/auth" && request.method === "POST") {
        const { email, password } = await request.json();
        if (!email || !password)
          return new Response("Missing credentials", { status: 400 });

        const store = env.DEEDS_KV;
        if (!store)
          return new Response("KV not bound", { status: 500 });

        const existing = await store.get(email);
        if (existing) return Response.json({ message: `Welcome back, ${email}` });

        const profile = {
          email,
          password,
          created: new Date().toISOString(),
        };
        await store.put(email, JSON.stringify(profile));
        return Response.json({ message: `Profile created for ${email}` });
      }

      // Debug endpoint to view all stored profiles
      if (url.pathname === "/api/debug") {
        const store = env.DEEDS_KV;
        const keys = await store.list();
        const result = {};
        for (const k of keys.keys || []) {
          const val = await store.get(k.name);
          try {
            result[k.name] = JSON.parse(val || "{}");
          } catch {
            result[k.name] = val;
          }
        }
        return Response.json(result);
      }

      // Default: serve static assets
      return env.ASSETS.fetch(request);
    } catch (err) {
      return new Response("Worker Error: " + err.message, { status: 500 });
    }
  },
};
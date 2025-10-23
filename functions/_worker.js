export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/auth" && request.method === "POST") {
      const { email, password } = await request.json();

      if (!env.DEEDS_KV) {
        return new Response("KV not bound", { status: 500 });
      }

      const existing = await env.DEEDS_KV.get(email);
      if (existing) {
        return Response.json({ message: `Welcome back, ${email}` });
      }

      await env.DEEDS_KV.put(email, JSON.stringify({ email, password, created: Date.now() }));

      return Response.json({ message: `Profile created for ${email}` });
    }

    return env.ASSETS.fetch(request);
  },
};

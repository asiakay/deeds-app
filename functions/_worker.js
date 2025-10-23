export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/auth" && request.method === "POST") {
      if (!env.DEEDS_KV) {
        return new Response("KV not bound", { status: 500 });
      }

      let payload;
      try {
        payload = await request.json();
      } catch (error) {
        return Response.json(
          { message: "Invalid JSON payload" },
          { status: 400 }
        );
      }

      const { email, password } = payload || {};

      if (!email || !password) {
        return Response.json(
          { message: "Email and password are required." },
          { status: 400 }
        );
      }

      const existing = await env.DEEDS_KV.get(email);
      if (existing) {
        try {
          const storedProfile = JSON.parse(existing);
          if (storedProfile.password !== password) {
            return Response.json(
              { message: "Incorrect password. Please try again." },
              { status: 401 }
            );
          }

          return Response.json({
            message: `Welcome back, ${email}!`,
            profile: {
              email: storedProfile.email,
              created: storedProfile.created,
            },
          });
        } catch (error) {
          return Response.json(
            { message: "Stored profile is corrupted. Please recreate your account." },
            { status: 500 }
          );
        }
      }

      const profile = { email, password, created: Date.now() };
      await env.DEEDS_KV.put(email, JSON.stringify(profile));

      return Response.json({
        message: `Profile created for ${email}!`,
        profile: {
          email: profile.email,
          created: profile.created,
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};

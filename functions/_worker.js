async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function responseWithMessage(message, status = 200, extra = {}) {
  return Response.json({ message, ...extra }, { status });
}

function buildCorsHeaders(request) {
  const origin = request.headers.get("Origin");
  const headers = new Headers();
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return headers;
}

function applyCors(request, response) {
  const corsHeaders = buildCorsHeaders(request);
  for (const [key, value] of corsHeaders) {
    if (value) {
      response.headers.set(key, value);
    }
  }
  return response;
}

function parseCookies(request) {
  const header = request.headers.get("Cookie");
  if (!header) return {};
  return header.split(/;\s*/).reduce((acc, part) => {
    if (!part) return acc;
    const [name, ...rest] = part.split("=");
    if (!name) return acc;
    acc[name] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function generateSessionToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function createSession(env, userId, ttlMinutes = 60 * 24 * 7) {
  const token = generateSessionToken();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + ttlMinutes * 60 * 1000);
  await env.DEEDS_DB.prepare(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)",
  )
    .bind(token, userId, createdAt.toISOString(), expiresAt.toISOString())
    .run();
  return { token, expiresAt };
}

async function getSession(env, token) {
  if (!token) return null;
  const row = await env.DEEDS_DB.prepare(
    `SELECT s.token, s.expires_at, u.id, u.name, u.email, u.created_at, u.completed_deeds
     FROM sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token = ?1`,
  )
    .bind(token)
    .first();

  if (!row) {
    return null;
  }

  const now = Date.now();
  const expiresAt = Date.parse(row.expires_at);
  if (Number.isFinite(expiresAt) && expiresAt < now) {
    await env.DEEDS_DB.prepare("DELETE FROM sessions WHERE token = ?1")
      .bind(token)
      .run();
    return null;
  }

  return row;
}

async function destroySession(env, token) {
  if (!token) return;
  await env.DEEDS_DB.prepare("DELETE FROM sessions WHERE token = ?1")
    .bind(token)
    .run();
}

function setSessionCookie(request, headers, token, expiresAt) {
  const url = new URL(request.url);
  const maxAgeSeconds = Math.max(
    0,
    Math.round((expiresAt.getTime() - Date.now()) / 1000),
  );
  const cookieParts = [
    `session=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Expires=${expiresAt.toUTCString()}`,
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (url.protocol === "https:") {
    cookieParts.push("Secure");
  }
  headers.append("Set-Cookie", cookieParts.join("; "));
}

function clearSessionCookie(request, headers) {
  const url = new URL(request.url);
  const cookieParts = [
    "session=",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
  ];
  if (url.protocol === "https:") {
    cookieParts.push("Secure");
  }
  headers.append("Set-Cookie", cookieParts.join("; "));
}

async function handleSignup(request, env) {
  if (!env.DEEDS_DB) {
    return responseWithMessage(
      "Database binding missing. Configure DEEDS_DB.",
      500,
    );
  }

  const payload = await parseJsonBody(request);
  if (!payload) {
    return responseWithMessage("Invalid JSON payload.", 400);
  }

  const name = String(payload.name || "").trim();
  const email = String(payload.email || "")
    .trim()
    .toLowerCase();
  const password = String(payload.password || "");

  if (!name || !email || !password) {
    return responseWithMessage("Name, email, and password are required.", 400);
  }

  if (password.length < 8) {
    return responseWithMessage(
      "Passwords must be at least 8 characters long.",
      400,
    );
  }

  try {
    const existing = await env.DEEDS_DB.prepare(
      "SELECT id FROM users WHERE email = ?1",
    )
      .bind(email)
      .first();

    if (existing) {
      return responseWithMessage(
        "An account with this email already exists. Please log in.",
        409,
      );
    }

    const hashedPassword = await hashPassword(password);
    const createdAt = new Date().toISOString();

    const result = await env.DEEDS_DB.prepare(
      "INSERT INTO users (name, email, password_hash, created_at) VALUES (?1, ?2, ?3, ?4)",
    )
      .bind(name, email, hashedPassword, createdAt)
      .run();

    const profile = {
      id: result.meta.last_row_id,
      name,
      email,
      createdAt,
      completed: 0,
    };

    const session = await createSession(env, profile.id);

    const response = responseWithMessage(
      `Welcome to Deeds, ${name.split(" ")[0]}!`,
      201,
      { profile },
    );
    setSessionCookie(
      request,
      response.headers,
      session.token,
      session.expiresAt,
    );
    return response;
  } catch (error) {
    console.error("Sign-up failed", error);
    return responseWithMessage(
      "We could not create your account. Please try again later.",
      500,
    );
  }
}

async function handleLogin(request, env) {
  if (!env.DEEDS_DB) {
    return responseWithMessage(
      "Database binding missing. Configure DEEDS_DB.",
      500,
    );
  }

  const payload = await parseJsonBody(request);
  if (!payload) {
    return responseWithMessage("Invalid JSON payload.", 400);
  }

  const email = String(payload.email || "")
    .trim()
    .toLowerCase();
  const password = String(payload.password || "");

  if (!email || !password) {
    return responseWithMessage("Email and password are required.", 400);
  }

  try {
    const user = await env.DEEDS_DB.prepare(
      "SELECT id, name, email, password_hash, created_at, completed_deeds FROM users WHERE email = ?1",
    )
      .bind(email)
      .first();

    if (!user) {
      return responseWithMessage(
        "We could not find that account. Please sign up first.",
        404,
      );
    }

    const hashedPassword = await hashPassword(password);
    const storedHash = String(user.password_hash || "");
    const normalizedStoredHash = storedHash.toLowerCase();
    const normalizedHashedPassword = hashedPassword.toLowerCase();
    let passwordMatches = normalizedStoredHash === normalizedHashedPassword;

    if (!passwordMatches) {
      const looksHashed = /^[a-f0-9]{64}$/.test(normalizedStoredHash);
      if (!looksHashed && storedHash === password) {
        passwordMatches = true;
        await env.DEEDS_DB.prepare(
          "UPDATE users SET password_hash = ?1 WHERE id = ?2",
        )
          .bind(hashedPassword, user.id)
          .run();
      }
    }

    if (!passwordMatches) {
      return responseWithMessage("Incorrect password. Please try again.", 401);
    }

    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
      completed: Number(user.completed_deeds ?? 0),
    };

    const session = await createSession(env, user.id);

    const greetingName = user.name?.split(" ")[0] || user.email;
    const response = responseWithMessage(
      `Welcome back, ${greetingName}!`,
      200,
      {
        profile,
      },
    );
    setSessionCookie(
      request,
      response.headers,
      session.token,
      session.expiresAt,
    );
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return responseWithMessage(
      "We could not log you in. Please try again later.",
      500,
    );
  }
}

async function handleProfile(request, env) {
  if (!env.DEEDS_DB) {
    return responseWithMessage(
      "Database binding missing. Configure DEEDS_DB.",
      500,
    );
  }

  const cookies = parseCookies(request);
  const token = cookies.session;
  const session = await getSession(env, token);
  if (!session) {
    return responseWithMessage("Authentication required.", 401);
  }

  const profile = {
    id: session.id,
    name: session.name,
    email: session.email,
    createdAt: session.created_at,
    completed: Number(session.completed_deeds ?? 0),
  };

  return Response.json({ profile });
}

async function handleLogout(request, env) {
  if (!env.DEEDS_DB) {
    return responseWithMessage(
      "Database binding missing. Configure DEEDS_DB.",
      500,
    );
  }

  const cookies = parseCookies(request);
  const token = cookies.session;
  if (token) {
    await destroySession(env, token);
  }

  const response = responseWithMessage("You have been logged out.");
  clearSessionCookie(request, response.headers);
  return response;
}

const DEFAULT_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Deeds App</title>
    <link
      rel="preconnect"
      href="https://fonts.googleapis.com"
      crossorigin
    />
    <link
      rel="preconnect"
      href="https://fonts.gstatic.com"
      crossorigin
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
      rel="stylesheet"
    />
    <style>
      body {
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
          sans-serif;
        background: #0f172a;
        color: #f8fafc;
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 3rem 1.5rem;
        text-align: center;
      }
      main {
        max-width: 32rem;
        background: rgba(15, 118, 110, 0.12);
        border-radius: 1.5rem;
        padding: 2.75rem 2.25rem;
        box-shadow: 0 30px 60px -25px rgba(15, 118, 110, 0.8);
        border: 1px solid rgba(148, 163, 184, 0.2);
      }
      h1 {
        font-size: clamp(1.85rem, 2.2vw + 1.4rem, 2.75rem);
        margin-bottom: 1rem;
      }
      p {
        margin: 0.5rem 0;
        color: rgba(226, 232, 240, 0.88);
      }
      .cta {
        margin-top: 2rem;
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        background: #0f766e;
        color: #f8fafc;
        padding: 0.85rem 1.8rem;
        border-radius: 999px;
        font-weight: 600;
        text-decoration: none;
        box-shadow: 0 12px 30px -18px rgba(45, 212, 191, 0.9);
        transition: transform 120ms ease, box-shadow 120ms ease;
      }
      .cta:hover {
        transform: translateY(-2px);
        box-shadow: 0 18px 36px -20px rgba(45, 212, 191, 1);
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Deeds App is getting things ready</h1>
      <p>Our updated experience is deploying now.</p>
      <p>Refresh in a moment to see the new landing page.</p>
      <a class="cta" href="/" rel="nofollow">Refresh</a>
    </main>
  </body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      const response = new Response(null, {
        status: 204,
      });
      return applyCors(request, response);
    }

    if (url.pathname === "/api/auth/signup" && request.method === "POST") {
      const response = await handleSignup(request, env);
      return applyCors(request, response);
    }

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      const response = await handleLogin(request, env);
      return applyCors(request, response);
    }

    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      const response = await handleLogout(request, env);
      return applyCors(request, response);
    }

    if (url.pathname === "/api/profile" && request.method === "GET") {
      const response = await handleProfile(request, env);
      return applyCors(request, response);
    }

    if (env.ASSETS) {
      let assetResponse = await env.ASSETS.fetch(request);

      if (assetResponse.status === 404 && request.method === "GET") {
        const indexUrl = new URL("/index.html", url.origin);
        const indexRequest = new Request(indexUrl.toString(), {
          method: "GET",
          headers: request.headers,
        });
        assetResponse = await env.ASSETS.fetch(indexRequest);
      }

      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    if (request.method === "GET") {
      const acceptsHTML = String(request.headers.get("accept") || "").includes(
        "text/html",
      );
      if (acceptsHTML) {
        return new Response(DEFAULT_HTML, {
          headers: { "Content-Type": "text/html; charset=UTF-8" },
        });
      }
    }

    return new Response("Not found", { status: 404 });
  },
};

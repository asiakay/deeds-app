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
    };

    return responseWithMessage(
      `Welcome to Deeds, ${name.split(" ")[0]}!`,
      201,
      { profile },
    );
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
      "SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?1",
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
    if (hashedPassword !== user.password_hash) {
      return responseWithMessage("Incorrect password. Please try again.", 401);
    }

    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    };

    const greetingName = user.name?.split(" ")[0] || user.email;
    return responseWithMessage(`Welcome back, ${greetingName}!`, 200, {
      profile,
    });
  } catch (error) {
    console.error("Login failed", error);
    return responseWithMessage(
      "We could not log you in. Please try again later.",
      500,
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (url.pathname === "/api/auth/signup" && request.method === "POST") {
      const response = await handleSignup(request, env);
      response.headers.set("Access-Control-Allow-Origin", "*");
      return response;
    }

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      const response = await handleLogin(request, env);
      response.headers.set("Access-Control-Allow-Origin", "*");
      return response;
    }
  },
};
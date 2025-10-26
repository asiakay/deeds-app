const DURATION_OPTIONS = [
  "Under 30 minutes",
  "30-60 minutes",
  "1-2 hours",
  "Half day",
];

const IMPACT_OPTIONS = [
  "Food access",
  "Housing",
  "Education",
  "Environment",
  "Community care",
];

async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
}

const STATIC_PAGE_ROUTES = new Map([
  ["/choose", "/choose.html"],
  ["/leaderboard", "/leaderboard.html"],
  ["/profile", "/profile.html"],
  ["/submit", "/submit.html"],
  ["/verify", "/verify.html"],
]);

function normalizePathname(pathname) {
  if (!pathname) {
    return "/";
  }
  if (pathname === "/") {
    return pathname;
  }
  return pathname.replace(/\/+$/, "");
}

function normalizeOption(value, options) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const match = options.find(
    (option) => option.toLowerCase() === trimmed.toLowerCase(),
  );
  return match || null;
}

function sanitizeText(value) {
  if (!value && value !== 0) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function sanitizePartners(value) {
  const sanitized = sanitizeText(value);
  if (!sanitized) return "";
  return sanitized
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function normalizeDeedDate(value) {
  const sanitized = sanitizeText(value);
  if (!sanitized) return null;
  const match = sanitized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

function normalizeUrl(value) {
  const sanitized = sanitizeText(value);
  if (!sanitized) return "";
  try {
    const url = new URL(sanitized);
    return url.toString();
  } catch (error) {
    return null;
  }
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
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

    const submittedHash = await hashPassword(password);
    const storedHash = String(user.password_hash || "");

    console.log("Login hash comparison", {
      submittedHash,
      storedHash,
    });

    if (submittedHash !== storedHash) {
      return responseWithMessage("Invalid email or password.", 401);
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

async function handleCreateDeed(request, env) {
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

  const userId = Number(payload.user_id ?? payload.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return responseWithMessage("A valid user_id must be provided.", 400);
  }

  const title = sanitizeText(payload.title ?? payload.deed_title);
  if (!title) {
    return responseWithMessage("A deed title is required.", 400);
  }

  const proofUrl = sanitizeText(
    payload.proof_url ?? payload.proofUrl ?? payload.proof ?? "",
  );
  if (!proofUrl) {
    return responseWithMessage(
      "A proof URL is required to submit your deed.",
      400,
    );
  }

  const description = sanitizeText(
    payload.description ?? payload.deed_description ?? payload.details,
  );

  let deedDate = null;
  const deedDateInput = sanitizeText(
    payload.deed_date ?? payload.date ?? payload.performed_on,
  );
  if (deedDateInput) {
    const normalized = normalizeDeedDate(deedDateInput);
    if (!normalized) {
      return responseWithMessage(
        "Please provide dates in YYYY-MM-DD format.",
        400,
      );
    }
    deedDate = normalized;
  }

  let duration = null;
  const durationInput =
    payload.duration ?? payload.time_spent ?? payload.timeSpent;
  if (durationInput) {
    duration = normalizeOption(durationInput, DURATION_OPTIONS);
    if (!duration) {
      return responseWithMessage(
        "Please choose one of the supported duration options.",
        400,
      );
    }
  }

  let impactArea = null;
  const impactInput =
    payload.impact ?? payload.impact_area ?? payload.impactArea;
  if (impactInput) {
    impactArea = normalizeOption(impactInput, IMPACT_OPTIONS);
    if (!impactArea) {
      return responseWithMessage(
        "Please choose one of the supported impact areas.",
        400,
      );
    }
  }

  const partners = sanitizePartners(
    payload.partners ?? payload.collaborators ?? payload.team,
  );

  try {
    const user = await env.DEEDS_DB.prepare(
      "SELECT id FROM users WHERE id = ?1",
    )
      .bind(userId)
      .first();

    if (!user) {
      return responseWithMessage(
        "We could not find that user account. Please log in again.",
        404,
      );
    }

    const result = await env.DEEDS_DB.prepare(
      `INSERT INTO deeds (
        user_id,
        title,
        proof_url,
        status,
        created_at,
        deed_date,
        duration,
        impact_area,
        description,
        partners
      ) VALUES (?1, ?2, ?3, 'pending', datetime('now'), ?4, ?5, ?6, ?7, ?8)`,
    )
      .bind(
        userId,
        title,
        proofUrl,
        deedDate,
        duration,
        impactArea,
        description || null,
        partners || null,
      )
      .run();

    return Response.json(
      { success: true, deed_id: result.meta.last_row_id },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create deed", error);
    return responseWithMessage(
      "We could not save your deed. Please try again later.",
      500,
    );
  }
}

async function handleVerifyDeed(request, env) {
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

  const deedId = Number(payload.deed_id ?? payload.deedId);
  if (!Number.isInteger(deedId) || deedId <= 0) {
    return responseWithMessage("A valid deed_id must be provided.", 400);
  }

  try {
    const updateResult = await env.DEEDS_DB.prepare(
      "UPDATE deeds SET status = 'verified' WHERE id = ?1",
    )
      .bind(deedId)
      .run();

    if (!updateResult.meta || updateResult.meta.changes === 0) {
      return responseWithMessage("We couldn't find that deed.", 404);
    }

    const user = await env.DEEDS_DB.prepare(
      "SELECT user_id FROM deeds WHERE id = ?1",
    )
      .bind(deedId)
      .first();

    if (!user) {
      return responseWithMessage("We couldn't find the deed owner.", 404);
    }

    await env.DEEDS_DB.prepare(
      "UPDATE users SET credits = credits + 1 WHERE id = ?1",
    )
      .bind(user.user_id)
      .run();

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to verify deed", error);
    return responseWithMessage(
      "We could not verify the deed. Please try again later.",
      500,
    );
  }
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

    if (url.pathname === "/api/deeds" && request.method === "POST") {
      const response = await handleCreateDeed(request, env);
      response.headers.set("Access-Control-Allow-Origin", "*");
      return response;
    }

    if (url.pathname === "/api/verify" && request.method === "POST") {
      const response = await handleVerifyDeed(request, env);
      response.headers.set("Access-Control-Allow-Origin", "*");
      return response;
    }

    if (url.pathname === "/api/leaderboard" && request.method === "GET") {
      if (!env.DEEDS_DB) {
        const response = responseWithMessage(
          "Database binding missing. Configure DEEDS_DB.",
          500,
        );
        response.headers.set("Access-Control-Allow-Origin", "*");
        return response;
      }

      try {
        const results = await env.DEEDS_DB.prepare(
          `SELECT name, credits
           FROM users
           ORDER BY credits DESC
           LIMIT 10`,
        ).all();

        const response = Response.json(results.results || []);
        response.headers.set("Access-Control-Allow-Origin", "*");
        return response;
      } catch (error) {
        console.error("Failed to load leaderboard", error);
        const response = responseWithMessage(
          "Unable to load leaderboard at this time.",
          500,
        );
        response.headers.set("Access-Control-Allow-Origin", "*");
        return response;
      }
    }

    if (env.ASSETS) {
      let assetRequest = request;

      if (request.method === "GET") {
        const normalizedPath = normalizePathname(url.pathname);
        const assetPath = STATIC_PAGE_ROUTES.get(normalizedPath);
        if (assetPath) {
          const assetUrl = new URL(assetPath, url.origin);
          assetRequest = new Request(assetUrl.toString(), {
            method: "GET",
            headers: new Headers(request.headers),
          });
        }
      }

      let assetResponse = await env.ASSETS.fetch(assetRequest);

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

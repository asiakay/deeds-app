const toneClassMap = {
  success: "text-teal-700",
  error: "text-rose-600",
  info: "text-slate-600",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function setMessage(element, message, tone = "info") {
  if (!element) return;
  element.textContent = message;
  element.classList.remove(...Object.values(toneClassMap));
  if (toneClassMap[tone]) {
    element.classList.add(toneClassMap[tone]);
  }
}

let profileCache = null;

async function fetchProfile(options = { force: false }) {
  if (!options.force && profileCache) {
    return profileCache;
  }

  try {
    const response = await fetch("/api/profile", {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      profileCache = null;
      return null;
    }

    const result = await response.json().catch(() => null);
    if (result?.profile) {
      const completed =
        result.profile.completed != null ? result.profile.completed : 0;
      profileCache = { ...result.profile, completed };
      return profileCache;
    }

    profileCache = null;
    return null;
  } catch (error) {
    console.warn("Unable to fetch profile", error);
    profileCache = null;
    return null;
  }
}

function attachAuthForms() {
  document.querySelectorAll("[data-auth-form]").forEach((form) => {
    const mode = form.dataset.authForm;
    const messageElement = form.querySelector('[data-role="form-message"]');
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const email = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "");
      const name = String(formData.get("name") || "").trim();

      if (!email || !password || (mode === "signup" && !name)) {
        setMessage(
          messageElement,
          "Please complete every field to continue.",
          "error",
        );
        return;
      }

      if (password.length < 8) {
        setMessage(
          messageElement,
          "Passwords need to be at least 8 characters long.",
          "error",
        );
        return;
      }

      const endpoint =
        mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const payload =
        mode === "signup" ? { name, email, password } : { email, password };

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.loading = "true";
      }
      setMessage(messageElement, "Checking your details…", "info");

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          credentials: "include",
        });

        const result = await response.json().catch(() => null);
        if (!response.ok) {
          const fallback =
            result?.message ||
            "We could not verify your details. Please try again.";
          setMessage(messageElement, fallback, "error");
          return;
        }

        if (result?.profile) {
          const completed =
            result.profile.completed != null ? result.profile.completed : 0;
          profileCache = { ...result.profile, completed };
        } else {
          profileCache = null;
        }

        setMessage(messageElement, result?.message || "Success!", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 400);
      } catch (error) {
        console.error("Auth request failed", error);
        setMessage(
          messageElement,
          "We could not reach the server. Please check your connection and try again.",
          "error",
        );
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          delete submitButton.dataset.loading;
        }
      }
    });
  });
}

function getInitials(name = "") {
  if (!name) return "D";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "D";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (
    parts[0].slice(0, 1).toUpperCase() +
    parts[parts.length - 1].slice(0, 1).toUpperCase()
  );
}

async function hydrateDashboard() {
  const nameTarget = document.querySelector('[data-profile-field="name"]');
  const emailTarget = document.querySelector('[data-profile-field="email"]');
  const createdTarget = document.querySelector(
    '[data-profile-field="createdAt"]',
  );
  const completedTarget = document.querySelector(
    '[data-profile-field="completed"]',
  );
  const initialsTarget = document.querySelector(
    '[data-profile-field="initials"]',
  );

  if (!nameTarget && !emailTarget && !createdTarget) {
    return;
  }

  const profile = await fetchProfile();
  if (!profile) {
    window.setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
    return;
  }

  if (nameTarget) {
    nameTarget.textContent = profile.name || profile.email || "Friend";
  }
  if (emailTarget) {
    emailTarget.textContent = profile.email || "—";
  }
  if (createdTarget) {
    createdTarget.textContent = formatDate(
      profile.createdAt || profile.created,
    );
  }
  if (completedTarget && profile.completed != null) {
    completedTarget.textContent = profile.completed;
  }
  if (initialsTarget) {
    initialsTarget.textContent = getInitials(profile.name || profile.email);
  }
}

function attachLogout() {
  document.querySelectorAll('[data-action="logout"]').forEach((button) => {
    button.addEventListener("click", async () => {
      profileCache = null;
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch (error) {
        console.warn("Unable to notify server about logout", error);
      }
      window.location.href = "login.html";
    });
  });
}

window.addEventListener("DOMContentLoaded", () => {
  attachAuthForms();
  hydrateDashboard().catch((error) => {
    console.error("Unable to hydrate dashboard", error);
  });
  attachLogout();
});

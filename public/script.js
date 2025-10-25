const STORAGE_KEY = "deeds.profile";

const toneClassMap = {
  success: "text-teal-700",
  error: "text-rose-600",
  info: "text-slate-600",
  accent: "text-teal-200",
};

function saveProfile(profile) {
  if (!profile) return;
  const enriched = {
    ...profile,
    completed: profile.completed ?? 3,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
  } catch (error) {
    console.warn("Unable to cache profile locally", error);
  }
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Unable to read cached profile", error);
    return null;
  }
}

function clearProfile() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Unable to clear cached profile", error);
  }
}

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
          saveProfile(result.profile);
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

function attachWaitlistForms() {
  document.querySelectorAll('[data-role="waitlist-form"]').forEach((form) => {
    const messageElement = form.querySelector('[data-role="form-message"]');
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const email = String(formData.get("email") || "").trim();
      const name = String(formData.get("name") || "").trim();

      if (!email) {
        setMessage(
          messageElement,
          "Please add your email so we know where to reach you.",
          "accent",
        );
        return;
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        setMessage(
          messageElement,
          "That email doesn't look quite right. Try again?",
          "accent",
        );
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.loading = "true";
      }
      setMessage(messageElement, "Adding you to the waitlist…", "accent");

      try {
        const response = await fetch("/api/waitlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, name }),
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          const fallback =
            result?.message ||
            "We had trouble saving that. Please try again in a moment.";
          setMessage(messageElement, fallback, "error");
          return;
        }

        setMessage(
          messageElement,
          result?.message ||
            "You're all set! We'll be in touch with updates soon.",
          "success",
        );
        form.reset();
      } catch (error) {
        console.error("Waitlist request failed", error);
        setMessage(
          messageElement,
          "We couldn't connect to the server. Please try again shortly.",
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

function updateDynamicYear() {
  const yearElement = document.querySelector('[data-role="year"]');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

function hydrateDashboard() {
  const profile = loadProfile();
  const nameTarget = document.querySelector('[data-profile-field="name"]');
  const emailTarget = document.querySelector('[data-profile-field="email"]');
  const createdTarget = document.querySelector(
    '[data-profile-field="createdAt"]',
  );
  const completedTarget = document.querySelector(
    '[data-profile-field="completed"]',
  );

  if (!nameTarget && !emailTarget && !createdTarget) {
    return;
  }

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
}

function attachLogout() {
  document.querySelectorAll('[data-action="logout"]').forEach((button) => {
    button.addEventListener("click", () => {
      clearProfile();
      window.location.href = "login.html";
    });
  });
}

window.addEventListener("DOMContentLoaded", () => {
  attachAuthForms();
  attachWaitlistForms();
  hydrateDashboard();
  attachLogout();
  updateDynamicYear();
});

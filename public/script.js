function togglePw() {
  const pw = document.getElementById("pw");
  pw.type = pw.type === "password" ? "text" : "password";
}

const toneClassMap = {
  success: "text-teal-700",
  error: "text-rose-600",
  info: "text-slate-600",
};

function saveProfile(profile) {
  localStorage.setItem("deeds.profile", JSON.stringify(profile));
}

function getProfile() {
  const data = localStorage.getItem("deeds.profile");
  if (!data) {
    return null;
  }
  try {
    return JSON.parse(data);
  } catch (error) {
    console.warn("Unable to parse cached profile", error);
    clearProfile();
    return null;
  }
}

function clearProfile() {
  localStorage.removeItem("deeds.profile");
}

const PROFILE_TTL_MS = 24 * 60 * 60 * 1000;
const PROTECTED_PAGES = new Set([
  "dashboard.html",
  "submit.html",
  "leaderboard.html",
]);

function isProfileExpired(profile) {
  if (!profile?.timestamp) {
    return false;
  }
  return Date.now() - Number(profile.timestamp) > PROFILE_TTL_MS;
}

function hydrateUI(profile) {
  const page = window.location.pathname.split("/").pop();
  if (page === "dashboard.html") {
    hydrateDashboard(profile);
  }
}

const currentPage = window.location.pathname.split("/").pop();
let sessionProfile = null;

if (PROTECTED_PAGES.has(currentPage)) {
  const profile = getProfile();
  if (!profile || isProfileExpired(profile)) {
    clearProfile();
    window.location.href = "login.html";
  } else {
    sessionProfile = profile;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => hydrateUI(profile));
    } else {
      hydrateUI(profile);
    }
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
          const nextProfile = {
            ...result.profile,
            timestamp: Date.now(),
          };
          saveProfile(nextProfile);
          sessionProfile = nextProfile;
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

function hydrateDashboard(profile) {
  if (!profile) {
    return;
  }
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
    button.addEventListener("click", () => {
      clearProfile();
      window.location.href = "login.html";
    });
  });
}

function attachDeedForm(profile) {
  const form = document.querySelector("[data-deed-form]");
  if (!form) {
    return;
  }

  const messageElement = form.querySelector('[data-role="form-message"]');
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const activeProfile = profile || sessionProfile || getProfile();
    if (
      !activeProfile ||
      isProfileExpired(activeProfile) ||
      !activeProfile.id
    ) {
      clearProfile();
      setMessage(
        messageElement,
        "Please log in again to submit your deed.",
        "error",
      );
      window.setTimeout(() => {
        window.location.href = "login.html";
      }, 600);
      return;
    }

    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const date = String(formData.get("date") || "").trim();
    const duration = String(formData.get("duration") || "").trim();
    const impact = String(formData.get("impact") || "").trim();
    const partners = String(formData.get("partners") || "").trim();

    if (!title || !description || !date || !duration) {
      setMessage(
        messageElement,
        "Please complete all required fields before submitting.",
        "error",
      );
      return;
    }

    const payload = {
      user_id: activeProfile.id,
      title,
      description,
      date,
      duration,
      impact,
      partners,
    };

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.loading = "true";
    }
    setMessage(messageElement, "Submitting your deed…", "info");

    try {
      const response = await fetch("/api/deeds", {
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
          "We couldn't save your deed right now. Please try again.";
        setMessage(messageElement, fallback, "error");
        return;
      }

      form.reset();
      setMessage(
        messageElement,
        "Your deed is on its way! We'll review it shortly.",
        "success",
      );
    } catch (error) {
      console.error("Failed to submit deed", error);
      setMessage(
        messageElement,
        "We couldn't reach the server. Please check your connection and try again.",
        "error",
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        delete submitButton.dataset.loading;
      }
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  attachAuthForms();
  attachLogout();
  attachDeedForm(sessionProfile);
  if (!sessionProfile && PROTECTED_PAGES.has(currentPage)) {
    const profile = getProfile();
    if (profile && !isProfileExpired(profile)) {
      sessionProfile = profile;
      hydrateUI(profile);
    }
  }
});

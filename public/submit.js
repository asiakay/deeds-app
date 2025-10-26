const feedbackToneClasses = {
  info: "text-slate-600",
  success: "text-teal-700",
  error: "text-rose-600",
};

function updateFeedback(message, tone = "info") {
  const feedback = document.getElementById("deedFeedback");
  if (!feedback) {
    return;
  }
  feedback.textContent = message || "";
  feedback.classList.remove(...Object.values(feedbackToneClasses));
  if (feedbackToneClasses[tone]) {
    feedback.classList.add(feedbackToneClasses[tone]);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("deedForm");
  if (!form) {
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const profileRaw = localStorage.getItem("deeds.profile");
    if (!profileRaw) {
      alert("Please log in again before submitting a deed.");
      window.location.href = "login.html";
      return;
    }

    let profile;
    try {
      profile = JSON.parse(profileRaw);
    } catch (error) {
      console.warn("Unable to parse cached profile", error);
      localStorage.removeItem("deeds.profile");
      alert("We couldn't read your profile. Please log in again.");
      window.location.href = "login.html";
      return;
    }

    if (!profile?.id) {
      alert("We couldn't find your account. Please log in again.");
      window.location.href = "login.html";
      return;
    }

    const titleInput = document.getElementById("deedTitle");
    const proofInput = document.getElementById("proofUrl");
    const title = titleInput ? titleInput.value.trim() : "";
    const proof_url = proofInput ? proofInput.value.trim() : "";

    if (!title || !proof_url) {
      updateFeedback("Please complete every field before submitting.", "error");
      return;
    }

    updateFeedback("Submitting your deed…", "info");

    try {
      const res = await fetch("/api/deeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: profile.id, title, proof_url }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        const message = data.message || "We couldn't save your deed right now.";
        alert(`Error: ${message}`);
        updateFeedback(message, "error");
        return;
      }

      alert("Deed submitted successfully!");
      form.reset();
      updateFeedback(
        "Your deed was submitted. We'll verify it shortly!",
        "success",
      );
    } catch (error) {
      console.error("Failed to submit deed", error);
      alert("Error: We couldn't reach the server. Please try again.");
      updateFeedback(
        "We couldn't reach the server. Please check your connection and try again.",
        "error",
      );
    }
  });
});

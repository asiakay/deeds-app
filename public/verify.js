const toneClassMap = {
  success: "text-teal-700",
  error: "text-rose-600",
  info: "text-slate-600",
};

function setFlash(message, tone = "info") {
  const flash = document.querySelector('[data-role="flash"]');
  if (!flash) return;

  flash.textContent = message || "";
  flash.classList.remove(...Object.values(toneClassMap));
  if (tone && toneClassMap[tone]) {
    flash.classList.add(toneClassMap[tone]);
  }
}

function formatDate(value) {
  if (!value) return "—";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch (error) {
    return value;
  }
}

function renderQueue(items) {
  const table = document.querySelector('[data-role="table"]');
  const tbody = document.querySelector('[data-role="queue"]');
  const loading = document.querySelector('[data-role="loading"]');
  const emptyState = document.querySelector('[data-role="empty"]');
  const summary = document.querySelector('[data-role="summary"]');

  if (!tbody || !table || !loading || !emptyState) {
    return;
  }

  tbody.innerHTML = "";

  if (!Array.isArray(items) || items.length === 0) {
    table.hidden = true;
    emptyState.hidden = false;
    loading.hidden = true;
    if (summary) {
      summary.textContent = "0 deeds awaiting review";
    }
    return;
  }

  const total = items.length;
  if (summary) {
    summary.textContent = `${total} pending ${total === 1 ? "deed" : "deeds"}`;
  }

  emptyState.hidden = true;
  loading.hidden = true;
  table.hidden = false;

  items.forEach((item) => {
    const row = document.createElement("tr");
    row.className = "text-sm text-slate-700";

    const deedCell = document.createElement("td");
    deedCell.className = "px-6 py-4 align-top";
    const title = document.createElement("div");
    title.className = "font-semibold text-slate-900";
    title.textContent = item?.title || "Untitled deed";
    const meta = document.createElement("div");
    meta.className = "mt-1 text-xs text-slate-500";
    meta.textContent = `Deed #${item?.id ?? "—"} • Member ${item?.user_id ?? "—"}`;
    deedCell.appendChild(title);
    deedCell.appendChild(meta);

    const submittedCell = document.createElement("td");
    submittedCell.className = "px-6 py-4 align-top text-slate-600";
    submittedCell.textContent = formatDate(item?.created_at);

    const proofCell = document.createElement("td");
    proofCell.className = "px-6 py-4 align-top";
    if (item?.proof_url) {
      const link = document.createElement("a");
      link.href = item.proof_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className =
        "inline-flex items-center gap-1 text-teal-700 hover:text-teal-800";
      link.textContent = "Open proof";
      proofCell.appendChild(link);
    } else {
      proofCell.textContent = "No link provided";
      proofCell.classList.add("text-slate-500");
    }

    const actionCell = document.createElement("td");
    actionCell.className = "px-6 py-4 align-top text-right";
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600";
    button.textContent = "Verify";
    button.addEventListener("click", () => verifyDeed(item?.id, button));
    actionCell.appendChild(button);

    row.appendChild(deedCell);
    row.appendChild(submittedCell);
    row.appendChild(proofCell);
    row.appendChild(actionCell);

    tbody.appendChild(row);
  });
}

async function fetchQueue() {
  const loading = document.querySelector('[data-role="loading"]');
  const emptyState = document.querySelector('[data-role="empty"]');
  const table = document.querySelector('[data-role="table"]');
  const summary = document.querySelector('[data-role="summary"]');

  if (loading) loading.hidden = false;
  if (emptyState) emptyState.hidden = true;
  if (table) table.hidden = true;
  if (summary) summary.textContent = "Loading…";

  try {
    const response = await fetch("/api/deeds?status=pending", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const message = `Unable to load pending deeds (status ${response.status}).`;
      setFlash(message, "error");
      return;
    }

    const data = await response.json();
    const items = Array.isArray(data) ? data : [];
    renderQueue(items);
    if (items.length === 0) {
      setFlash("No pending deeds at the moment.", "info");
    } else {
      setFlash("Pending deeds loaded.", "success");
    }
  } catch (error) {
    console.error("Failed to load pending deeds", error);
    setFlash(
      "We couldn't load the pending queue. Please try again shortly.",
      "error",
    );
    if (summary) {
      summary.textContent = "Queue unavailable";
    }
  } finally {
    if (loading) {
      loading.hidden = true;
    }
  }
}

async function verifyDeed(deedId, button) {
  if (!deedId || !button) {
    return;
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Verifying…";

  try {
    const response = await fetch("/api/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ deed_id: deedId }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success) {
      const message =
        result?.message || "We couldn't verify this deed. Please try again.";
      throw new Error(message);
    }

    setFlash("Deed verified and credits awarded.", "success");
    await fetchQueue();
  } catch (error) {
    console.error("Verify deed failed", error);
    setFlash(error?.message || "Verification failed. Please retry.", "error");
  } finally {
    if (button.isConnected) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const refreshButton = document.querySelector('[data-action="refresh"]');
  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      setFlash("Refreshing queue…", "info");
      fetchQueue();
    });
  }

  fetchQueue();
});

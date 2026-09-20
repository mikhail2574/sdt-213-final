const seedUsers = [
  { id: 1, name: "Mykhailo Naumenko", email: "mykhailo@coreplatform.dev", role: "Administrator", status: "Active", lastActive: "2 min ago" },
  { id: 2, name: "Yaroslav Kalinichenko", email: "yaroslav@coreplatform.dev", role: "Operator", status: "Active", lastActive: "18 min ago" },
  { id: 3, name: "Vladyslav Konrad", email: "vladyslav@coreplatform.dev", role: "Administrator", status: "Active", lastActive: "41 min ago" },
  { id: 4, name: "Olivia Martin", email: "olivia.martin@example.com", role: "Viewer", status: "Active", lastActive: "Today, 09:24" },
  { id: 5, name: "Noah Williams", email: "noah.williams@example.com", role: "Operator", status: "Pending", lastActive: "Invitation sent" },
  { id: 6, name: "Sophia Clark", email: "sophia.clark@example.com", role: "Viewer", status: "Inactive", lastActive: "Sep 12, 2026" }
];

const activity = [
  { time: "Today, 19:42", actor: "Yaroslav K.", action: "Updated user role", target: "Noah Williams", result: "Success" },
  { time: "Today, 19:18", actor: "Vladyslav K.", action: "Reviewed access policy", target: "Operator role", result: "Success" },
  { time: "Today, 18:56", actor: "Mykhailo N.", action: "Validated service status", target: "Core API", result: "Success" },
  { time: "Today, 18:31", actor: "Yaroslav K.", action: "Created test account", target: "QA Viewer", result: "Success" },
  { time: "Yesterday, 21:04", actor: "Vladyslav K.", action: "Exported activity log", target: "Weekly audit", result: "Success" },
  { time: "Yesterday, 20:48", actor: "Mykhailo N.", action: "Updated platform setting", target: "Session timeout", result: "Success" }
];

let users = JSON.parse(localStorage.getItem("core-platform-users") || "null") || seedUsers;

const loginScreen = document.querySelector("#login-screen");
const appShell = document.querySelector("#app-shell");
const pageTitle = document.querySelector("#page-title");
const userDialog = document.querySelector("#user-dialog");
const toast = document.querySelector("#toast");

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

function signIn() {
  loginScreen.hidden = true;
  appShell.hidden = false;
  sessionStorage.setItem("core-platform-session", "active");
}

function switchView(viewName) {
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("is-visible", view.id === `view-${viewName}`));
  document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("is-active", button.dataset.view === viewName));
  const active = document.querySelector(`#view-${viewName}`);
  pageTitle.textContent = active?.dataset.title || "Core Platform";
}

function statusClass(status) {
  if (status === "Active") return "pill--success";
  if (status === "Pending") return "pill--pending";
  return "pill--inactive";
}

function renderUsers() {
  const query = document.querySelector("#user-search").value.trim().toLowerCase();
  const role = document.querySelector("#role-filter").value;
  const status = document.querySelector("#status-filter").value;
  const filtered = users.filter(user => {
    const matchesText = `${user.name} ${user.email}`.toLowerCase().includes(query);
    return matchesText && (role === "all" || user.role === role) && (status === "all" || user.status === status);
  });

  document.querySelector("#users-table-body").innerHTML = filtered.map(user => `
    <tr>
      <td><div class="user-cell"><span class="avatar">${initials(user.name)}</span><span><strong>${user.name}</strong><small>${user.email}</small></span></div></td>
      <td>${user.role}</td>
      <td><span class="pill ${statusClass(user.status)}">${user.status}</span></td>
      <td>${user.lastActive}</td>
      <td><div class="row-actions"><button class="mini-button" data-toggle-user="${user.id}" type="button">${user.status === "Inactive" ? "Activate" : "Deactivate"}</button></div></td>
    </tr>
  `).join("");
  document.querySelector("#user-count").textContent = `Showing ${filtered.length} of ${users.length} users`;
  document.querySelector("#metric-total").textContent = String(122 + users.length);
  document.querySelector("#metric-active").textContent = String(113 + users.filter(user => user.status === "Active").length);
}

function renderActivity() {
  document.querySelector("#dashboard-activity").innerHTML = activity.slice(0, 4).map(item => `
    <div class="activity-item"><span class="activity-icon">✓</span><span><strong>${item.action}</strong><small>${item.actor} · ${item.target}</small></span><span class="activity-time">${item.time.split(", ").pop()}</span></div>
  `).join("");
  document.querySelector("#activity-table-body").innerHTML = activity.map(item => `
    <tr><td>${item.time}</td><td>${item.actor}</td><td>${item.action}</td><td>${item.target}</td><td><span class="pill pill--success">${item.result}</span></td></tr>
  `).join("");
}

document.querySelector("#login-form").addEventListener("submit", event => {
  event.preventDefault();
  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;
  if (email === "admin@coreplatform.dev" && password === "admin123") {
    document.querySelector("#login-error").textContent = "";
    signIn();
  } else {
    document.querySelector("#login-error").textContent = "Use the demo credentials shown below the form.";
  }
});

document.querySelector("#logout-button").addEventListener("click", () => {
  sessionStorage.removeItem("core-platform-session");
  appShell.hidden = true;
  loginScreen.hidden = false;
});

document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => switchView(button.dataset.view)));
document.querySelectorAll("[data-jump]").forEach(button => button.addEventListener("click", () => switchView(button.dataset.jump)));
document.querySelector("#add-user-button").addEventListener("click", () => userDialog.showModal());

document.querySelector("#user-form").addEventListener("submit", event => {
  const submitter = event.submitter;
  if (!submitter || submitter.value !== "default") return;
  event.preventDefault();
  const name = document.querySelector("#new-name").value.trim();
  const email = document.querySelector("#new-email").value.trim();
  if (!name || !email) return;
  users.unshift({ id: Date.now(), name, email, role: document.querySelector("#new-role").value, status: document.querySelector("#new-status").value, lastActive: "Just created" });
  localStorage.setItem("core-platform-users", JSON.stringify(users));
  renderUsers();
  userDialog.close();
  event.target.reset();
  showToast(`${name} was created successfully.`);
});

document.querySelector("#users-table-body").addEventListener("click", event => {
  const button = event.target.closest("[data-toggle-user]");
  if (!button) return;
  const user = users.find(item => item.id === Number(button.dataset.toggleUser));
  if (!user) return;
  user.status = user.status === "Inactive" ? "Active" : "Inactive";
  localStorage.setItem("core-platform-users", JSON.stringify(users));
  renderUsers();
  showToast(`${user.name} is now ${user.status.toLowerCase()}.`);
});

["#user-search", "#role-filter", "#status-filter"].forEach(selector => {
  document.querySelector(selector).addEventListener("input", renderUsers);
});

document.querySelector("#export-button").addEventListener("click", () => {
  const lines = [["Timestamp", "Actor", "Action", "Target", "Result"], ...activity.map(item => [item.time, item.actor, item.action, item.target, item.result])];
  const csv = lines.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "core-platform-activity.csv";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Activity log exported.");
});

renderUsers();
renderActivity();

const demo = new URLSearchParams(window.location.search).get("demo");
if (demo) {
  signIn();
  const demoView = demo === "add" ? "users" : demo;
  switchView(["dashboard", "users", "roles", "status", "activity"].includes(demoView) ? demoView : "dashboard");
  if (demo === "add") window.setTimeout(() => userDialog.showModal(), 100);
} else if (sessionStorage.getItem("core-platform-session") === "active") {
  signIn();
}

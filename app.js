const API_BASE = "https://ib-system-consult-platform.onrender.com";

const $ = (selector) => document.querySelector(selector);

const toast = (message) => {
  const t = $("#toast");

  if (!t) return;

  t.textContent = message;
  t.classList.add("show");

  setTimeout(() => {
    t.classList.remove("show");
  }, 2800);
};

// ===============================
// SIDEBAR
// ===============================

const menuBtn = $("#menuBtn");
const sidebar = $("#sidebar");

if (menuBtn && sidebar) {
  menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
}

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    sidebar?.classList.remove("open");
  });
});

// ===============================
// MODALS
// ===============================

document.querySelectorAll("[data-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    const modal = $("#" + button.dataset.modal);

    if (modal) {
      modal.classList.add("show");
    }
  });
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    button.closest(".modal")?.classList.remove("show");
  });
});

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.remove("show");
    }
  });
});

// ===============================
// AUTH STORAGE
// ===============================

const TOKEN_KEY = "ib_auth_token";
const USER_KEY = "ib_user";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ===============================
// AUTH UI
// ===============================

const authBtn = $("#authBtn");
const userAvatar = $("#userAvatar");
const authModal = $("#authModal");

function updateAuthUI() {
  const user = getUser();

  if (!authBtn) return;

  if (user) {
    authBtn.textContent = user.name
      ? user.name.split(" ")[0]
      : "Account";

    if (userAvatar) {
      userAvatar.textContent = user.name
        ? user.name.charAt(0).toUpperCase()
        : "U";
    }
  } else {
    authBtn.textContent = "Login";

    if (userAvatar) {
      userAvatar.textContent = "IB";
    }
  }
}

if (authBtn) {
  authBtn.addEventListener("click", () => {
    const user = getUser();

    if (user) {
      const shouldLogout = confirm(
        `You are logged in as ${user.name}.\n\nDo you want to log out?`
      );

      if (shouldLogout) {
        clearAuth();
        updateAuthUI();
        loadAccountDashboard();
        loadMyRequests();
        toast("You have been logged out.");
      }

      return;
    }

    authModal?.classList.add("show");
  });
}

updateAuthUI();

// ===============================
// ACCOUNT DASHBOARD
// ===============================

async function loadAccountDashboard() {
  const token = getToken();

  const accountName = $("#accountName");
  const accountEmail = $("#accountEmail");
  const accountPhone = $("#accountPhone");
  const accountRole = $("#accountRole");
  const accountAvatar = $("#accountAvatar");

  if (!token) {
    if (accountName) accountName.textContent = "Guest";

    if (accountEmail) {
      accountEmail.textContent =
        "Please log in to view your account.";
    }

    if (accountPhone) accountPhone.textContent = "—";
    if (accountRole) accountRole.textContent = "Client";
    if (accountAvatar) accountAvatar.textContent = "IB";

    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/auth/me`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      clearAuth();
      updateAuthUI();
      return;
    }

    const user = data.user;

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(user)
    );

    if (accountName) {
      accountName.textContent = user.name;
    }

    if (accountEmail) {
      accountEmail.textContent = user.email;
    }

    if (accountPhone) {
      accountPhone.textContent = user.phone;
    }

    if (accountRole) {
      accountRole.textContent =
        user.role === "admin"
          ? "Administrator"
          : "Client";
    }

    if (accountAvatar) {
      accountAvatar.textContent =
        user.name?.charAt(0).toUpperCase() || "U";
    }

    updateAuthUI();
  } catch (error) {
    console.error(
      "Account dashboard error:",
      error
    );
  }
}

// ===============================
// LOGIN / REGISTER SWITCH
// ===============================

const loginView = $("#loginView");
const registerView = $("#registerView");

const showRegister = $("#showRegister");
const showLogin = $("#showLogin");

if (showRegister) {
  showRegister.addEventListener("click", () => {
    if (loginView) {
      loginView.style.display = "none";
    }

    if (registerView) {
      registerView.style.display = "block";
    }
  });
}

if (showLogin) {
  showLogin.addEventListener("click", () => {
    if (registerView) {
      registerView.style.display = "none";
    }

    if (loginView) {
      loginView.style.display = "block";
    }
  });
}

// ===============================
// REGISTER
// ===============================

const registerForm = $("#registerForm");

if (registerForm) {
  registerForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const name = $("#registerName")?.value.trim();
      const email = $("#registerEmail")?.value.trim();
      const phone = $("#registerPhone")?.value.trim();
      const password = $("#registerPassword")?.value;

      if (!name || !email || !phone || !password) {
        toast("Please complete all fields.");
        return;
      }

      if (password.length < 8) {
        toast(
          "Password must be at least 8 characters."
        );
        return;
      }

      const submitButton =
        registerForm.querySelector(
          'button[type="submit"]'
        );

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent =
          "Creating account...";
      }

      try {
        const response = await fetch(
          `${API_BASE}/api/auth/register`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name,
              email,
              phone,
              password,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          toast(
            data.message ||
              "Unable to create account."
          );
          return;
        }

        saveAuth(data.token, data.user);

        updateAuthUI();
        await loadAccountDashboard();
        await loadMyRequests();

        registerForm.reset();

        authModal?.classList.remove("show");

        toast("Account created successfully.");
      } catch (error) {
        console.error(error);
        toast(
          "Unable to connect to the server."
        );
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent =
            "Create Account";
        }
      }
    }
  );
}

// ===============================
// LOGIN
// ===============================

const loginForm = $("#loginForm");

if (loginForm) {
  loginForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const email = $("#loginEmail")?.value.trim();
      const password = $("#loginPassword")?.value;

      if (!email || !password) {
        toast(
          "Enter your email and password."
        );
        return;
      }

      const submitButton =
        loginForm.querySelector(
          'button[type="submit"]'
        );

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Logging in...";
      }

      try {
        const response = await fetch(
          `${API_BASE}/api/auth/login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              password,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          toast(
            data.message || "Login failed."
          );
          return;
        }

        saveAuth(data.token, data.user);

        updateAuthUI();
        await loadAccountDashboard();
        await loadMyRequests();

        loginForm.reset();

        authModal?.classList.remove("show");

        toast("Login successful.");
      } catch (error) {
        console.error(error);
        toast(
          "Unable to connect to the server."
        );
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Login";
        }
      }
    }
  );
}

// ===============================
// MY REQUESTS
// ===============================

async function loadMyRequests() {
  const requestsList = $("#requestsList");

  if (!requestsList) return;

  const token = getToken();

  if (!token) {
    requestsList.innerHTML = `
      <div class="empty-state">
        <h3>Login required</h3>
        <p>Please log in to view your service requests.</p>
      </div>
    `;

    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/requests`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      requestsList.innerHTML = `
        <div class="empty-state">
          <h3>Unable to load requests</h3>
          <p>${data.message || "Please try again."}</p>
        </div>
      `;

      return;
    }

    if (
      !data.requests ||
      data.requests.length === 0
    ) {
      requestsList.innerHTML = `
        <div class="empty-state">
          <h3>No requests yet</h3>
          <p>Your service requests will appear here.</p>
        </div>
      `;

      return;
    }

    requestsList.innerHTML = data.requests
      .map((request) => {
        const date = new Date(
          request.created_at
        ).toLocaleString();

        return `
          <div class="request-card">
            <div>
              <span class="muted">Service</span>
              <h3>${request.service}</h3>
            </div>

            <span class="request-status">
              ${request.status}
            </span>

            <p>${request.message}</p>

            <small>${date}</small>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error(
      "My requests error:",
      error
    );

    requestsList.innerHTML = `
      <div class="empty-state">
        <h3>Connection error</h3>
        <p>Unable to connect to the server.</p>
      </div>
    `;
  }
}
// ===============================
// ADMIN DASHBOARD
// ===============================

async function loadAdminRequests() {
  const adminList = $("#adminRequestsList");

  if (!adminList) return;

  const token = getToken();
  const user = getUser();

  if (!token || !user || user.role !== "admin") {
    adminList.innerHTML = `
      <div class="empty-state">
        <h3>Admin access required</h3>
        <p>This section is only available to administrators.</p>
      </div>
    `;

    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/admin/requests`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      adminList.innerHTML = `
        <div class="empty-state">
          <h3>Unable to load requests</h3>
          <p>${data.message || "Please try again."}</p>
        </div>
      `;

      return;
    }

    if (!data.requests || data.requests.length === 0) {
      adminList.innerHTML = `
        <div class="empty-state">
          <h3>No service requests</h3>
          <p>Customer requests will appear here.</p>
        </div>
      `;

      return;
    }

    adminList.innerHTML = data.requests
      .map((request) => {
        const date = new Date(
          request.created_at
        ).toLocaleString();

        return `
          <div class="request-card">
            <div>
              <span class="muted">Customer</span>
              <h3>${request.name}</h3>
              <p>${request.email}</p>
              <p>${request.phone}</p>
            </div>

            <div>
              <span class="muted">Service</span>
              <h3>${request.service}</h3>
            </div>

            <span class="request-status">
              ${request.status}
            </span>

            <p>${request.message}</p>

            <small>${date}</small>
          </div>
        `;
      })
      .join("");

  } catch (error) {
    console.error(
      "Admin requests error:",
      error
    );

    adminList.innerHTML = `
      <div class="empty-state">
        <h3>Connection error</h3>
        <p>Unable to connect to the server.</p>
      </div>
    `;
  }
}
// ===============================
// SERVICE REQUEST BUTTONS
// ===============================

document
  .querySelectorAll(".service-card")
  .forEach((card) => {
    const button = card.querySelector("button");

    if (!button) return;

    button.addEventListener("click", () => {
      const service =
        card.dataset.service || "";

      const contactModal =
        $("#contactModal");

      if (contactModal) {
        contactModal.classList.add("show");
      }

      const serviceSelect =
        $("#contactService");

      if (serviceSelect && service) {
        serviceSelect.value = service;
      }
    });
  });

// ===============================
// CONTACT / SERVICE REQUEST FORM
// ===============================

const contactForm = $("#contactForm");

if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      authModal?.classList.add("show");
      toast("Please log in before submitting a service request.");
      return;
    }

    const name = $("#contactName")?.value.trim();
    const phone = $("#contactPhone")?.value.trim();
    const email = $("#contactEmail")?.value.trim();
    const service = $("#contactService")?.value;
    const message = $("#contactMessage")?.value.trim();

    if (!name || !phone || !service || !message) {
      toast("Please complete all required fields.");
      return;
    }

    const submitButton = $("#contactSubmit");

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            service,
            message: `Name: ${name}
Phone: ${phone}
Email: ${email || "Not provided"}

${message}`,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast(
          data.message || "Unable to submit service request."
        );
        return;
      }

      toast("Service request submitted successfully.");

      contactForm.reset();

      const modal = $("#contactModal");

      if (modal) {
        modal.classList.remove("show");
      }

      await loadMyRequests();

    } catch (error) {
      console.error("Service request error:", error);
      toast("Unable to submit service request.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Request";
      }
    }
  });
}

// ===============================
// FUNDING BUTTON
// ===============================

const fundBtn = $("#fundBtn");

if (fundBtn) {
  fundBtn.addEventListener(
    "click",
    () => {
      const amount = Number(
        $("#fundAmount")?.value
      );

      if (!amount || amount < 100) {
        toast(
          "Enter an amount of at least ₦100."
        );

        return;
      }

      toast(
        "Payment gateway will be connected later."
      );

      const fundModal =
        $("#fundModal");

      if (fundModal) {
        fundModal.classList.remove("show");
      }
    }
  );
}

// ===============================
// INITIALIZE
// ===============================

loadAccountDashboard();
loadMyRequests();
if (getUser()?.role === "admin") {
  loadAdminRequests();
}

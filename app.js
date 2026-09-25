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
const accountWallet = $("#accountWallet");
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
if (accountWallet) {
  accountWallet.textContent =
    `₦${Number(user.wallet_balance || 0).toLocaleString()}`;
      }
    const overviewWallet = $("#overviewWallet");

if (overviewWallet) {
  overviewWallet.textContent =
    `₦${Number(user.wallet_balance || 0).toLocaleString()}`;
}
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
  const requestsEmpty = $("#requestsEmpty");
const overviewOpenRequests = $("#overviewOpenRequests");
const overviewCompletedRequests = $("#overviewCompletedRequests");
  if (!requestsList) return;

  const token = getToken();

  if (!token) {
    if (requestsEmpty) requestsEmpty.style.display = "block";

    requestsList.innerHTML = `
      <div class="empty-state">
        <h3>Login required</h3>
        <p>Please log in to view your service requests.</p>
      </div>
    `;
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/requests`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      if (requestsEmpty) requestsEmpty.style.display = "none";

      requestsList.innerHTML = `
        <div class="empty-state">
          <h3>Unable to load requests</h3>
          <p>${data.error || "Please try again."}</p>
        </div>
      `;
      return;
    }
const openRequests = data.requests
  ? data.requests.filter(
      request =>
        request.status === "pending" ||
        request.status === "processing"
    ).length
  : 0;

const completedRequests = data.requests
  ? data.requests.filter(
      request => request.status === "completed"
    ).length
  : 0;

if (overviewOpenRequests) {
  overviewOpenRequests.textContent = openRequests;
}

if (overviewCompletedRequests) {
  overviewCompletedRequests.textContent = completedRequests;
}
    if (!data.requests || data.requests.length === 0) {
      if (requestsEmpty) requestsEmpty.style.display = "block";

      requestsList.innerHTML = "";
      return;
    }

    // Requests exist — hide the empty message
    if (requestsEmpty) requestsEmpty.style.display = "none";

    requestsList.innerHTML = data.requests.map(request => {
      const date = new Date(request.created_at).toLocaleString();

      return `
        <div class="request-card">
          <div>
            <span class="muted">Service</span>
            <h3>${request.service}</h3>
          </div>

          <span class="request-status">${request.status}</span>

          <p>${request.message}</p>

          <small>${date}</small>
        </div>
      `;
    }).join("");

  } catch (error) {
    if (requestsEmpty) requestsEmpty.style.display = "none";

    requestsList.innerHTML = `
      <div class="empty-state">
        <h3>Unable to load requests</h3>
        <p>Please check your connection and try again.</p>
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

            <select
              class="request-status-select"
              data-request-id="${request.id}"
            >
              <option value="pending" ${request.status === "pending" ? "selected" : ""}>
                Pending
              </option>

              <option value="processing" ${request.status === "processing" ? "selected" : ""}>
                Processing
              </option>

              <option value="completed" ${request.status === "completed" ? "selected" : ""}>
                Completed
              </option>
            </select>

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
// ADMIN - LOAD DASHBOARD STATS
// ===============================

async function loadAdminStats() {
  const token = getToken();
  const user = getUser();

  if (!token || !user || user.role !== "admin") {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/admin/stats`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Admin stats error:",
        data.message
      );
      return;
    }

    const stats = data.stats;

    const totalCustomers =
      $("#adminTotalCustomers");

    const totalRequests =
      $("#adminTotalRequests");

    const pendingRequests =
      $("#adminPendingRequests");

    const processingRequests =
      $("#adminProcessingRequests");

    const completedRequests =
      $("#adminCompletedRequests");

    if (totalCustomers) {
      totalCustomers.textContent =
        stats.total_customers;
    }

    if (totalRequests) {
      totalRequests.textContent =
        stats.total_requests;
    }

    if (pendingRequests) {
      pendingRequests.textContent =
        stats.pending_requests;
    }

    if (processingRequests) {
      processingRequests.textContent =
        stats.processing_requests;
    }

    if (completedRequests) {
      completedRequests.textContent =
        stats.completed_requests;
    }

  } catch (error) {
    console.error(
      "Admin stats connection error:",
      error
    );
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
  fundBtn.addEventListener("click", async () => {
    const amount = Number(
      $("#fundAmount")?.value
    );

    if (!amount || amount < 100) {
      toast("Enter an amount of at least ₦100.");
      return;
    }

    const token = getToken();

    if (!token) {
      toast("Please log in first.");
      return;
    }

    fundBtn.disabled = true;
    fundBtn.textContent = "Starting payment...";

    try {
      const response = await fetch(
        `${API_BASE}/api/flutterwave/fund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: amount,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
  console.log("Flutterwave backend response:", data);

  toast(
    data.message ||
    JSON.stringify(data) ||
    "Unable to start payment."
  );

  return;
      }

      window.location.href =
        data.payment_link;

    } catch (error) {
      console.error(
        "Flutterwave payment error:",
        error
      );

      toast(
        "Unable to connect to the payment server."
      );

    } finally {
      fundBtn.disabled = false;
      fundBtn.textContent =
        "Continue to payment";
    }
  });
}
async function loadTransactions() {
  const transactionsSection = $("#transactions");

  if (!transactionsSection) return;

  const token = getToken();

  if (!token) {
    transactionsSection.querySelector(".transaction-empty").innerHTML = `
      <div class="empty-icon">🔐</div>
      <h3>Login required</h3>
      <p>Please log in to view your transactions.</p>
    `;
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/transactions`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      transactionsSection.querySelector(".transaction-empty").innerHTML = `
        <div class="empty-icon">!</div>
        <h3>Unable to load transactions</h3>
        <p>${data.message || "Please try again."}</p>
      `;
      return;
    }

    if (!data.transactions || data.transactions.length === 0) {
      transactionsSection.querySelector(".transaction-empty").innerHTML = `
        <div class="empty-icon">₦</div>
        <h3>No transactions yet</h3>
        <p>Your wallet funding and service payment activity will appear here.</p>
      `;
      return;
    }

    const transactionList = document.createElement("div");
    transactionList.className = "transaction-list";

    transactionList.innerHTML = data.transactions
      .map((transaction) => {
        const date = new Date(
          transaction.created_at
        ).toLocaleString();

        const amount = Number(
          transaction.amount
        ).toLocaleString("en-NG", {
          minimumFractionDigits: 2,
        });

        return `
          <div class="request-card transaction-card">
            <div>
              <span class="muted">Transaction</span>
              <h3>${transaction.type === "credit" ? "Wallet Funding" : transaction.type}</h3>
              <small>${date}</small>
            </div>

            <div>
              <strong>₦${amount}</strong>
              <p class="muted">${transaction.status}</p>
            </div>

            <small>Reference: ${transaction.reference}</small>
          </div>
        `;
      })
      .join("");

    const emptyCard =
      transactionsSection.querySelector(".transaction-empty");

    if (emptyCard) {
      emptyCard.replaceWith(transactionList);
    }

  } catch (error) {
    console.error(
      "Transactions error:",
      error
    );

    const emptyCard =
      transactionsSection.querySelector(".transaction-empty");

    if (emptyCard) {
      emptyCard.innerHTML = `
        <div class="empty-icon">!</div>
        <h3>Connection error</h3>
        <p>Unable to connect to the server.</p>
      `;
    }
  }
}
// ===============================
// INITIALIZE
// ===============================

loadAccountDashboard();
loadMyRequests();
document.addEventListener("change", async (event) => {
  if (!event.target.classList.contains("request-status-select")) {
    return;
  }

  const requestId = event.target.dataset.requestId;
  const status = event.target.value;
  const token = getToken();

  if (!token || !requestId) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/admin/requests/${requestId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      toast(
        data.message || "Unable to update request status."
      );
      return;
    }

    toast("Request status updated successfully.");

    await loadAdminRequests();

  } catch (error) {
    console.error(
      "Update request status error:",
      error
    );

    toast("Unable to update request status.");
  }
});
if (getUser()?.role === "admin") {
  loadAdminRequests();
  loadAdminStats();
  loadAdminCustomers();
}
document.addEventListener("click", async (event) => {
  if (!event.target.classList.contains("customer-view-btn")) {
    return;
  }

  const customerId = event.target.dataset.customerId;
  const token = getToken();

  if (!token || !customerId) return;

  try {
    const response = await fetch(
      `${API_BASE}/api/admin/customers/${customerId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      toast(data.message || "Unable to load customer.");
      return;
    }

    const customer = data.customer;

    $("#profileCustomerName").textContent =
      customer.name;

    $("#profileCustomerEmail").textContent =
      customer.email;

    $("#profileCustomerPhone").textContent =
      customer.phone;
const cleanPhone =
  customer.phone.replace(/\D/g, "");

const whatsappPhone =
  cleanPhone.startsWith("0")
    ? "234" + cleanPhone.slice(1)
    : cleanPhone;

const whatsappBtn =
  $("#profileWhatsAppBtn");

const callBtn =
  $("#profileCallBtn");

if (whatsappBtn) {
  whatsappBtn.href =
    `https://wa.me/${whatsappPhone}`;
}

if (callBtn) {
  callBtn.href =
    `tel:${customer.phone}`;
}
    $("#profileCustomerJoined").textContent =
      new Date(customer.created_at).toLocaleDateString();

    const requestsBox =
      $("#profileCustomerRequests");

    if (!data.requests || data.requests.length === 0) {
      requestsBox.innerHTML =
        `<p class="muted">No service requests yet.</p>`;
    } else {
      requestsBox.innerHTML = data.requests
        .map(
          (request) => `
            <div class="request-card">
              <h3>${request.service}</h3>
              <p>${request.message}</p>
              <strong>Status: ${request.status}</strong>
              <small>
                ${new Date(
                  request.created_at
                ).toLocaleString()}
              </small>
            </div>
          `
        )
        .join("");
    }

    $("#customerProfileModal").classList.add("show");
    $("#customerProfileModal").setAttribute(
      "aria-hidden",
      "false"
    );

  } catch (error) {
    console.error(
      "Customer profile error:",
      error
    );

    toast("Unable to connect to the server.");
  }
});
document.addEventListener("click", (event) => {
  if (event.target.id === "closeCustomerProfile") {
    const modal = $("#customerProfileModal");

    if (modal) {
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
    }
  }
});
// ===============================
// ADMIN - LOAD CUSTOMERS
// ===============================

async function loadAdminCustomers() {
  const customersList = $("#adminCustomersList");

  if (!customersList) return;

  const token = getToken();
  const user = getUser();

  if (!token || !user || user.role !== "admin") {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/admin/customers`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      customersList.innerHTML = `
        <div class="empty-state">
          <h3>Unable to load customers</h3>
          <p>${data.message || "Please try again."}</p>
        </div>
      `;
      return;
    }

    if (!data.customers || data.customers.length === 0) {
      customersList.innerHTML = `
        <div class="empty-state">
          <h3>No customers yet</h3>
          <p>Registered customers will appear here.</p>
        </div>
      `;
      return;
    }

    customersList.innerHTML = data.customers
      .map((customer) => {
        const date = new Date(
          customer.created_at
        ).toLocaleString();

        return `
          <div class="request-card">
            <div>
              <span class="muted">Customer</span>
              <h3>${customer.name}</h3>
              <p>${customer.email}</p>
              <p>${customer.phone}</p>
            </div>
<button
  class="customer-view-btn"
  data-customer-id="${customer.id}"
>
  View Customer
</button>
            <small>Joined: ${date}</small>
          </div>
        `;
      })
      .join("");

  } catch (error) {
    console.error(
      "Admin customers error:",
      error
    );

    customersList.innerHTML = `
      <div class="empty-state">
        <h3>Connection error</h3>
        <p>Unable to connect to the server.</p>
      </div>
    `;
  }
        }
// ===============================
// FLUTTERWAVE PAYMENT RETURN
// ===============================

(async function handleFlutterwaveReturn() {
  const params = new URLSearchParams(window.location.search);

  const status = params.get("status");
  const transactionId = params.get("transaction_id");
  const payment = params.get("payment");
  if (payment === "success") {
  await loadAccountDashboard();
  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  );
  return;
  }
  if (payment === "success") {
  await loadAccountDashboard();
  window.history.replaceState({}, document.title, window.location.pathname);
  return;
}


  const token = getToken();

  if (!token) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/flutterwave/verify/${transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      toast(
        `Wallet funded successfully: ₦${Number(data.amount).toLocaleString()}`
      );

      await loadAccountDashboard();
    } else {
      toast(
        data.message || "Payment verification failed."
      );
    }

  } catch (error) {
    console.error(
      "Flutterwave return verification error:",
      error
    );

    toast("Unable to verify your payment.");
  }

  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  );
})();

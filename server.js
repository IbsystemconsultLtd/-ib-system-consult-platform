const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// ===============================
// BASIC CONFIGURATION
// ===============================

const PORT = process.env.PORT || 10000;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// DATABASE CONFIGURATION
// ===============================

let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  pool.on("error", (err) => {
    console.error("PostgreSQL error:", err.message);
  });
} else {
  console.log("DATABASE_URL not found. Server will run without database.");
}

// ===============================
// DATABASE TABLES
// ===============================

async function ensureUsersTable() {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      phone VARCHAR(50) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
// ===============================
// WALLET BALANCE
// ===============================

async function ensureWalletColumn() {
  if (!pool) return;

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 0
  `);
}
// ===============================
// SERVICE REQUESTS TABLE
// ===============================

async function ensureRequestsTable() {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      service VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
// ===============================
// AUTHENTICATION HELPERS
// ===============================

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const token = header.substring(7);

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired login session.",
    });
  }
}

// ===============================
// HOME ROUTE
// ===============================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "IB System Consult API is running",
    company: "IB SYSTEM CONSULT LTD",
    status: "online",
  });
});

// ===============================
// HEALTH CHECK
// ===============================

app.get("/health", async (req, res) => {
  if (!pool) {
    return res.json({
      success: true,
      server: "online",
      database: "not configured",
    });
  }

  try {
    await pool.query("SELECT NOW()");

    res.json({
      success: true,
      server: "online",
      database: "connected",
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      server: "online",
      database: "disconnected",
      error: error.message,
    });
  }
});

// ===============================
// COMPANY INFORMATION
// ===============================

app.get("/api/company", (req, res) => {
  res.json({
    name: "IB SYSTEM CONSULT LTD",
    services: [
      "NIN Registration",
      "NIN Modification",
      "SIM Registration",
      "SIM Services",
      "JAMB Services",
      "O'Level Services",
      "School Admission Processing",
      "Result Checking",
      "Education Consultancy",
      "POS and Telecom Services",
    ],
    phone: "09016587081",
    email: "alaoibrahim766@gmail.com",
  });
});

// ===============================
// SERVICES
// ===============================

app.get("/api/services", (req, res) => {
  res.json({
    success: true,
    services: [
      {
        id: 1,
        name: "NIN Services",
        description:
          "NIN registration, modification and related NIN support services.",
      },
      {
        id: 2,
        name: "SIM Registration",
        description:
          "SIM registration and telecommunications support services.",
      },
      {
        id: 3,
        name: "School Processing",
        description:
          "Assistance with admission and school-related processing.",
      },
      {
        id: 4,
        name: "JAMB Services",
        description:
          "JAMB-related registration, checking and support services.",
      },
      {
        id: 5,
        name: "Result Checking",
        description:
          "Educational result checking and related support.",
      },
      {
        id: 6,
        name: "POS & Telecom",
        description:
          "POS and telecommunications-related services.",
      },
    ],
  });
});

// ===============================
// REGISTER
// ===============================

app.post("/api/auth/register", async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database is not available.",
      });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Authentication system is not configured.",
      });
    }

    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone number and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    await ensureUsersTable();

    const existingUser = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER($1)
         OR phone = $2
      LIMIT 1
      `,
      [email.trim(), phone.trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email or phone number already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `
      INSERT INTO users
(name, email, phone, password_hash, role)
VALUES (
  $1,
  LOWER($2),
  $3,
  $4,
  CASE
    WHEN LOWER($2) = LOWER($5) THEN 'admin'
    ELSE 'user'
  END
)
      RETURNING id, name, email, phone, role, created_at
      `,
      [
  name.trim(),
  email.trim(),
  phone.trim(),
  passwordHash,
  process.env.ADMIN_EMAIL || "",
      ]
    );

    const user = result.rows[0];

    const token = createToken(user);

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user,
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to create account.",
    });
  }
});

// ===============================
// LOGIN
// ===============================

app.post("/api/auth/login", async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database is not available.",
      });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Authentication system is not configured.",
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    await ensureUsersTable();

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        phone,
        password_hash,
        role,
        created_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (
  process.env.ADMIN_EMAIL &&
  user.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()
) {
  user.role = "admin";
}

delete user.password_hash;

const token = createToken(user);

    res.json({
      success: true,
      message: "Login successful.",
      token,
      user,
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to log in.",
    });
  }
});

// ===============================
// CURRENT USER
// ===============================

app.get("/api/auth/me", authRequired, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database is not available.",
      });
    }

    const result = await pool.query(
      `
      SELECT id, name, email, phone, role, wallet_balance, created_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Profile error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to load account.",
    });
  }
});
// ===============================
// CREATE SERVICE REQUEST
// ===============================

app.post("/api/requests", authRequired, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database is not available.",
      });
    }

    const { service, message } = req.body;

    if (!service || !message) {
      return res.status(400).json({
        success: false,
        message: "Service and message are required.",
      });
    }

    await ensureRequestsTable();

    const result = await pool.query(
      `
      INSERT INTO service_requests
      (user_id, service, message)
      VALUES ($1, $2, $3)
      RETURNING id, service, message, status, created_at
      `,
      [
        req.user.id,
        service.trim(),
        message.trim(),
      ]
    );

    res.status(201).json({
      success: true,
      message: "Service request submitted successfully.",
      request: result.rows[0],
    });
  } catch (error) {
    console.error("Create request error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to submit service request.",
    });
  }
});
// ===============================
// GET MY SERVICE REQUESTS
// ===============================

app.get("/api/requests", authRequired, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database is not available.",
      });
    }

    await ensureRequestsTable();

    const result = await pool.query(
      `
      SELECT
        id,
        service,
        message,
        status,
        created_at
      FROM service_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    res.json({
      success: true,
      requests: result.rows,
    });
  } catch (error) {
    console.error("Get requests error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to load your requests.",
    });
  }
});
// ===============================
// ADMIN - GET ALL SERVICE REQUESTS
// ===============================

app.get("/api/admin/requests", authRequired, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database is not available.",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    await ensureRequestsTable();

    const result = await pool.query(`
      SELECT
        service_requests.id,
        service_requests.service,
        service_requests.message,
        service_requests.status,
        service_requests.created_at,
        users.name,
        users.email,
        users.phone
      FROM service_requests
      JOIN users
        ON users.id = service_requests.user_id
      ORDER BY service_requests.created_at DESC
    `);

    res.json({
      success: true,
      requests: result.rows,
    });
  } catch (error) {
    console.error("Admin requests error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to load admin requests.",
    });
  }
});
// ===============================
// ADMIN - UPDATE SERVICE REQUEST STATUS
// ===============================

app.patch("/api/admin/requests/:id/status", authRequired, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database is not available.",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const { status } = req.body;
    const allowedStatuses = [
      "pending",
      "processing",
      "completed",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request status.",
      });
    }

    await ensureRequestsTable();

    const result = await pool.query(
      `
      UPDATE service_requests
      SET status = $1
      WHERE id = $2
      RETURNING id, service, status
      `,
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Service request not found.",
      });
    }

    res.json({
      success: true,
      message: "Request status updated successfully.",
      request: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Update request status error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Unable to update request status.",
    });
  }
});
// ===============================
// ADMIN - DASHBOARD STATISTICS
// ===============================

app.get("/api/admin/stats", authRequired, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database is not available.",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    await ensureRequestsTable();
    await ensureUsersTable();

    const requestsResult = await pool.query(`
      SELECT
        COUNT(*)::int AS total_requests,
        COUNT(*) FILTER (
          WHERE status = 'pending'
        )::int AS pending_requests,
        COUNT(*) FILTER (
          WHERE status = 'processing'
        )::int AS processing_requests,
        COUNT(*) FILTER (
          WHERE status = 'completed'
        )::int AS completed_requests
      FROM service_requests
    `);

    const usersResult = await pool.query(`
      SELECT COUNT(*)::int AS total_customers
      FROM users
      WHERE role = 'user'
    `);

    res.json({
      success: true,
      stats: {
        ...requestsResult.rows[0],
        total_customers: usersResult.rows[0].total_customers,
      },
    });

  } catch (error) {
    console.error(
      "Admin stats error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Unable to load dashboard statistics.",
    });
  }
});
// ===============================
// ADMIN - GET ALL CUSTOMERS
// ===============================

app.get("/api/admin/customers", authRequired, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database is not available.",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    await ensureUsersTable();

    const result = await pool.query(`
      SELECT
  id,
  name,
  email,
  phone,
  password_hash,
  role,
  wallet_balance,
  created_at
FROM users
      WHERE role = 'user'
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      customers: result.rows,
    });

  } catch (error) {
    console.error(
      "Admin customers error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Unable to load customers.",
    });
  }
});
// ===============================
// ADMIN - GET CUSTOMER DETAILS
// ===============================

app.get("/api/admin/customers/:id", authRequired, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database is not available.",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    await ensureUsersTable();
    await ensureRequestsTable();

    const customerResult = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        phone,
        created_at
      FROM users
      WHERE id = $1
        AND role = 'user'
      `,
      [req.params.id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    const requestsResult = await pool.query(
      `
      SELECT
        id,
        service,
        message,
        status,
        created_at
      FROM service_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [req.params.id]
    );

    res.json({
      success: true,
      customer: customerResult.rows[0],
      requests: requestsResult.rows,
    });

  } catch (error) {
    console.error(
      "Admin customer details error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Unable to load customer details.",
    });
  }
});
// ===============================
// CONTACT FORM
// ===============================

app.post("/api/contact", async (req, res) => {
  try {
    const { name, phone, email, service, message } = req.body;

    if (!name || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, phone number and message are required.",
      });
    }

    if (pool) {
      await pool.query(
        `
        CREATE TABLE IF NOT EXISTS contact_messages (
          id SERIAL PRIMARY KEY,
          name VARCHAR(150) NOT NULL,
          phone VARCHAR(50) NOT NULL,
          email VARCHAR(150),
          service VARCHAR(150),
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        `
      );

      await pool.query(
        `
        INSERT INTO contact_messages
        (name, phone, email, service, message)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          name,
          phone,
          email || null,
          service || null,
          message,
        ]
      );
    }

    res.status(201).json({
      success: true,
      message:
        "Your message has been received. IB SYSTEM CONSULT LTD will contact you soon.",
    });
  } catch (error) {
    console.error("Contact form error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to process your message.",
    });
  }
});

// ===============================
// 404 ROUTE
// ===============================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found.",
  });
});

// ===============================
// START SERVER
// ===============================
if (pool) {
  ensureWalletColumn().catch((error) => {
    console.error(
      "Wallet setup failed:",
      error.message
    );
  });
}
// ===============================
// PAYSTACK: INITIALIZE PAYMENT
// ===============================

app.post("/api/wallet/fund", authRequired, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database is not available.",
      });
    }

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Payment gateway is not configured.",
      });
    }

    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum wallet funding is ₦100.",
      });
    }

    await ensureWalletColumn();

    const userResult = await pool.query(
      `
      SELECT id, name, email
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    const user = userResult.rows[0];
console.log("PAYSTACK KEY EXISTS:", !!PAYSTACK_SECRET_KEY);
console.log("PAYSTACK USER EMAIL:", user.email);
console.log("PAYSTACK AMOUNT:", Math.round(amount * 100));
    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: Math.round(amount * 100),
          metadata: {
            user_id: user.id,
            purpose: "wallet_funding",
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
  console.error(
    "Paystack initialization failed:",
    data
  );

  return res.status(502).json({
    success: false,
    message:
      data.message ||
      data.data?.message ||
      "Unable to initialize payment.",
  });
    }

    res.json({
      success: true,
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });

  } catch (error) {
    console.error(
      "Wallet funding error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Unable to start payment.",
    });
  }
});
// ===============================
// PAYSTACK: VERIFY PAYMENT
// ===============================

app.get("/api/wallet/verify/:reference", authRequired, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database is not available.",
      });
    }

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Payment gateway is not configured.",
      });
    }

    const reference = req.params.reference;

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      return res.status(502).json({
        success: false,
        message: "Unable to verify payment.",
      });
    }

    const transaction = data.data;

    if (transaction.status !== "success") {
      return res.status(400).json({
        success: false,
        message: "Payment was not successful.",
      });
    }

    const paidAmount = Number(transaction.amount) / 100;
    const paidUserId =
      transaction.metadata?.user_id;

    if (
      !paidUserId ||
      Number(paidUserId) !== Number(req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Payment does not belong to this account.",
      });
    }

    // Prevent the same payment reference
    // from being credited more than once.
    const referenceCheck = await pool.query(
      `
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reference VARCHAR(150) UNIQUE NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        status VARCHAR(30) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `
    );

    const existing = await pool.query(
      `
      SELECT id
      FROM wallet_transactions
      WHERE reference = $1
      `,
      [reference]
    );

    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        message: "Payment has already been credited.",
        amount: paidAmount,
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
        UPDATE users
        SET wallet_balance =
          wallet_balance + $1
        WHERE id = $2
        `,
        [paidAmount, req.user.id]
      );

      await client.query(
        `
        INSERT INTO wallet_transactions
          (user_id, reference, amount, status)
        VALUES
          ($1, $2, $3, 'success')
        `,
        [
          req.user.id,
          reference,
          paidAmount,
        ]
      );

      await client.query("COMMIT");

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      message: "Wallet funded successfully.",
      amount: paidAmount,
    });

  } catch (error) {
    console.error(
      "Wallet payment verification error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Unable to verify wallet payment.",
    });
  }
});
// ===============================
// FLUTTERWAVE: INITIALIZE PAYMENT
// ===============================

app.post("/api/flutterwave/fund", authRequired, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database is not available.",
      });
    }

    if (!FLW_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Flutterwave is not configured.",
      });
    }

    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum wallet funding is ₦100.",
      });
    }

    await ensureWalletColumn();

    const userResult = await pool.query(
      `
      SELECT id, name, email, phone
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    const user = userResult.rows[0];

    const response = await fetch(
      "https://api.flutterwave.com/v3/payments",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: `IB-${user.id}-${Date.now()}`,
          amount: amount,
          currency: "NGN",
          redirect_url:
            "https://ibsystemconsultltd.github.io/-ib-system-consult-platform/",
          customer: {
            email: user.email,
            name: user.name,
            phonenumber: user.phone,
          },
          customizations: {
            title: "IB SYSTEM CONSULT LTD",
            description: "Wallet Funding",
          },
          meta: {
            user_id: user.id,
            purpose: "wallet_funding",
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || data.status !== "success") {
  console.error(
    "Flutterwave initialization failed:",
    data
  );

  return res.status(502).json({
    success: false,
    message:
      data.message ||
      data.data?.message ||
      "Unable to initialize Flutterwave payment.",
    debug: data,
  });
    }

    res.json({
      success: true,
      payment_link: data.data.link,
      tx_ref: data.data.tx_ref,
    });

    } catch (error) {
  console.error(
  "Flutterwave funding error:",
  error
);

    res.status(500).json({
      success: false,
      message: "Unable to start payment.",
    });
  }
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `IB System Consult API listening on port ${PORT}`
  );
});

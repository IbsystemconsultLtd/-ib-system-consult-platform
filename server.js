const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// ===============================
// BASIC CONFIGURATION
// ===============================

const PORT = process.env.PORT || 10000;
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
      SELECT id, name, email, phone, role, created_at
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `IB System Consult API listening on port ${PORT}`
  );
});

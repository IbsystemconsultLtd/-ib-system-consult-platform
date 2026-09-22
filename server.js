const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

// ===============================
// BASIC CONFIGURATION
// ===============================

const PORT = process.env.PORT || 10000;

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

    // If database is available, save the message.
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
        [name, phone, email || null, service || null, message]
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

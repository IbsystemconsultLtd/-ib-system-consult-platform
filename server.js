require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 10000;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? {rejectUnauthorized:false} : false
});

app.use(cors({origin: process.env.FRONTEND_URL || "*"}));
app.use(express.json());

function token(user) {
  return jwt.sign({sub:user.id,email:user.email}, process.env.JWT_SECRET, {expiresIn:"7d"});
}

async function auth(req,res,next) {
  try {
    const h = req.headers.authorization || "";
    const t = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!t) return res.status(401).json({error:"Authentication required."});
    const p = jwt.verify(t, process.env.JWT_SECRET);
    const r = await pool.query(
      "SELECT id,full_name,email,phone,wallet_balance,created_at FROM users WHERE id=$1",[p.sub]
    );
    if (!r.rows[0]) return res.status(401).json({error:"User not found."});
    req.user=r.rows[0]; next();
  } catch { res.status(401).json({error:"Invalid or expired session."}); }
}

app.get("/health", async (_req,res)=>{
  try { await pool.query("SELECT 1"); res.json({ok:true,service:"IB System Consult API"}); }
  catch { res.status(503).json({ok:false,error:"Database unavailable."}); }
});

app.post("/api/auth/register", async (req,res)=>{
  try {
    const {fullName,email,phone,password}=req.body;
    if(!fullName||!email||!password) return res.status(400).json({error:"Full name, email and password are required."});
    if(password.length<8) return res.status(400).json({error:"Password must be at least 8 characters."});
    const e=String(email).trim().toLowerCase();
    const exists=await pool.query("SELECT id FROM users WHERE email=$1",[e]);
    if(exists.rows.length) return res.status(409).json({error:"An account with this email already exists."});
    const hash=await bcrypt.hash(password,12);
    const r=await pool.query(
      "INSERT INTO users(full_name,email,phone,password_hash) VALUES($1,$2,$3,$4) RETURNING id,full_name,email,phone,wallet_balance,created_at",
      [String(fullName).trim(),e,phone||null,hash]
    );
    res.status(201).json({user:r.rows[0],token:token(r.rows[0])});
  } catch(e){ console.error(e); res.status(500).json({error:"Unable to create account."}); }
});

app.post("/api/auth/login", async (req,res)=>{
  try {
    const e=String(req.body.email||"").trim().toLowerCase();
    const r=await pool.query("SELECT * FROM users WHERE email=$1",[e]);
    const u=r.rows[0];
    if(!u || !(await bcrypt.compare(req.body.password||"",u.password_hash)))
      return res.status(401).json({error:"Invalid email or password."});
    const safe={id:u.id,full_name:u.full_name,email:u.email,phone:u.phone,wallet_balance:u.wallet_balance,created_at:u.created_at};
    res.json({user:safe,token:token(u)});
  } catch(e){ console.error(e); res.status(500).json({error:"Unable to sign in."}); }
});

app.get("/api/me",auth,(req,res)=>res.json({user:req.user}));

app.get("/api/transactions",auth,async(req,res)=>{
  const r=await pool.query(
    "SELECT id,type,amount,description,reference,created_at FROM wallet_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",
    [req.user.id]
  );
  res.json({transactions:r.rows});
});

app.get("/api/requests",auth,async(req,res)=>{
  const r=await pool.query(
    "SELECT id,service,status,details,created_at,updated_at FROM service_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",
    [req.user.id]
  );
  res.json({requests:r.rows});
});

app.post("/api/requests",auth,async(req,res)=>{
  const {service,details}=req.body;
  if(!service) return res.status(400).json({error:"Service is required."});
  const r=await pool.query(
    "INSERT INTO service_requests(user_id,service,details) VALUES($1,$2,$3) RETURNING id,service,status,details,created_at,updated_at",
    [req.user.id,String(service).trim(),details||null]
  );
  res.status(201).json({request:r.rows[0]});
});

app.use((_req,res)=>res.status(404).json({error:"Endpoint not found."}));
app.listen(port,()=>console.log("IB System Consult API listening on port "+port));
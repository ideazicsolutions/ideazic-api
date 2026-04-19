const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { Pool } = require("pg"); // ✅ ADDED

const app = express();

// ================= DATABASE =================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log("DB connected ✅"))
  .catch(err => console.error("DB error ❌", err));

// create table
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      booking_id TEXT,
      client TEXT,
      phone TEXT,
      services TEXT,
      status TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
})();

// ---------------- WEBHOOK URLS ----------------
const BOOKING_WEBHOOK_URL =
  "https://services.leadconnectorhq.com/hooks/DQwQEDZeR14RV6YlCH1K/webhook-trigger/dc71f37a-226a-49f5-ae92-f3f48d85348a";

const VISA_WEBHOOK_URL =
  "https://services.leadconnectorhq.com/hooks/DQwQEDZeR14RV6YlCH1K/webhook-trigger/d205c7e0-b97c-4766-be55-2d5090efcd99";

const TRAVELER_WEBHOOK_URL =
  "https://services.leadconnectorhq.com/hooks/DQwQEDZeR14RV6YlCH1K/webhook-trigger/6b21f929-43a8-4bab-b7d2-2d4a47d0ccd3";

const TRANSPORT_WEBHOOK_URL =
  "https://services.leadconnectorhq.com/hooks/DQwQEDZeR14RV6YlCH1K/webhook-trigger/d124e038-b942-439a-a11e-d98e3fbe1ec8";

const TICKET_WEBHOOK_URL =
  "https://services.leadconnectorhq.com/hooks/DQwQEDZeR14RV6YlCH1K/webhook-trigger/79434a14-e565-493b-a9b7-7f80eeaeb77a";

const PROVIDER_WEBHOOK_URL =
  "https://services.leadconnectorhq.com/hooks/DQwQEDZeR14RV6YlCH1K/webhook-trigger/c4ccbc17-c032-4ccd-bc4c-a5de5c8f5b23";

const HOTEL_WEBHOOK_URL =
  "https://services.leadconnectorhq.com/hooks/DQwQEDZeR14RV6YlCH1K/webhook-trigger/35b2c3a2-65b0-4068-80ff-8538500ac103";

const FINANCIAL_WEBHOOK_URL =
  "https://services.leadconnectorhq.com/hooks/DQwQEDZeR14RV6YlCH1K/webhook-trigger/7f788d48-f016-41c6-9808-4c44fedb074e";

const DOCUMENT_WEBHOOK_URL =
  "https://services.leadconnectorhq.com/hooks/DQwQEDZeR14RV6YlCH1K/webhook-trigger/e0f5564f-5b5c-4d01-ba92-2cdf55d05f54";

const CONTACTS_API_URL = "https://services.leadconnectorhq.com/contacts/";

// ---------------- APP SETUP ----------------
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 20 }
});

function apiAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ---------------- HELPERS ----------------
function parseJsonSafe(v, f) { try { return typeof v==="object"?v:JSON.parse(v) } catch { return f } }
function asArray(v) { return Array.isArray(v)?v:(v?[v]:[]) }
function asString(v) { return v==null?"":String(v).trim() }
function phoneFull(p) { return p?`${p.code||""}${p.number||""}`:"" }
function safeNumber(v,f=0){const n=Number(v);return isFinite(n)?n:f}

// ---------------- ROUTES ----------------
app.get("/", (req, res) => {
  res.send("Ideazic API is running 🚀");
});

app.post("/booking", apiAuth, upload.array("files"), async (req, res) => {
  try {
    const data = req.body.data ? parseJsonSafe(req.body.data, {}) : req.body;
    const files = Array.isArray(req.files) ? req.files : [];

    const bookingId = asString(data.id);
    const firstName = asString(data.firstName);
    const lastName = asString(data.lastName);
    const client = `${firstName} ${lastName}`.trim();
    const phone = phoneFull(data.phone);
    const services = asArray(data.services).join(",");
    const status = asString(data.status || "new");

    // ✅ SAVE TO DATABASE (THIS IS THE FIX)
    await pool.query(
      `INSERT INTO bookings (booking_id, client, phone, services, status)
       VALUES ($1,$2,$3,$4,$5)`,
      [bookingId, client, phone, services, status]
    );

    console.log("Saved to DB ✅");

    // KEEP YOUR WEBHOOK SYSTEM
    await fetch(BOOKING_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: bookingId,
        first_name: firstName,
        last_name: lastName,
        phone_full: phone,
        services,
        status
      })
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ================= GET BOOKINGS =================
app.get("/bookings", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM bookings ORDER BY id DESC");
    res.json(result.rows);
  } catch {
    res.status(500).send("Error");
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running...");
});

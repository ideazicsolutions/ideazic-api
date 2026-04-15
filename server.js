const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();

const BOOKING_WEBHOOK_URL =
  "https://services.leadconnectorhq.com/hooks/DQwQEDZeR14RV6YlCH1K/webhook-trigger/dc71f37a-226a-49f5-ae92-f3f48d85348a";

const CONTACTS_API_URL = "https://services.leadconnectorhq.com/contacts/";

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 20
  }
});

function apiAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function parseJsonSafe(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  return [value];
}

function asString(value) {
  return value == null ? "" : String(value).trim();
}

function toDateOnly(value) {
  if (!value) return "";
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function mapCustomerType(value) {
  const v = asString(value);
  if (v === "Direct") return "Direct";
  if (v === "Agency" || v === "Agency Partner" || v === "Referred" || v === "Reseller") return "Agency";
  if (v === "Partner" || v === "Supplier") return "Partner";
  return "Direct";
}

function mapStatus(value) {
  const v = asString(value).toLowerCase();
  if (v === "new") return "new";
  if (v === "progress" || v === "in_progress") return "in_progress";
  if (v === "waiting") return "waiting";
  if (v === "done" || v === "completed") return "completed";
  return "new";
}

function phoneFull(phone) {
  if (!phone || typeof phone !== "object") return "";
  return `${asString(phone.code)}${asString(phone.number)}`;
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function parseResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function buildDocuments(data, files) {
  const bodyDocs = asArray(parseJsonSafe(data.documents, []));
  const uploaded = files.map((file, index) => {
    const meta = bodyDocs[index] || {};
    return {
      document_name: asString(meta.document_name) || file.originalname,
      document_type: asString(meta.document_type) || "Other",
      related_section: asString(meta.related_section) || "Booking",
      related_name:
        asString(meta.related_name) ||
        asString(data.customerName) ||
        `${asString(data.firstName)} ${asString(data.lastName)}`.trim(),
      upload_file: "",
      document_date: toDateOnly(meta.document_date) || toDateOnly(new Date()),
      notes: asString(meta.notes),
      status: asString(meta.status) || "Active",
      file_name: file.originalname,
      file_type: file.mimetype,
      file_size: file.size
    };
  });

  const bodyOnly = bodyDocs
    .slice(uploaded.length)
    .map((doc) => ({
      document_name: asString(doc.document_name),
      document_type: asString(doc.document_type) || "Other",
      related_section: asString(doc.related_section) || "Booking",
      related_name: asString(doc.related_name),
      upload_file: asString(doc.upload_file),
      document_date: toDateOnly(doc.document_date),
      notes: asString(doc.notes),
      status: asString(doc.status) || "Active"
    }))
    .filter((doc) => doc.document_name || doc.upload_file);

  return [...uploaded, ...bodyOnly];
}

// Test route
app.get("/", (req, res) => {
  res.send("Ideazic API is running 🚀");
});

// Booking route
app.post("/booking", apiAuth, upload.array("files"), async (req, res) => {
  try {
    const data = req.body.data ? parseJsonSafe(req.body.data, {}) : req.body;
    const files = Array.isArray(req.files) ? req.files : [];

    console.log("New Booking:", data);
    console.log(
      "Uploaded Files:",
      files.map((file) => ({
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      }))
    );

    const bookingPayload = {
      booking_id: asString(data.id),
      created_at: toDateOnly(data.createdAt),
      status: mapStatus(data.status),
      customer_type: mapCustomerType(data.customerType),
      services: asArray(data.services).map(asString).filter(Boolean),
      next_action: asString(data.nextAction),
      follow_up_date: toDateOnly(data.followUpDate || data.follow_up_date),
      notes: asString(data.notes),
      phone_full: phoneFull(data.phone),
      first_name: asString(data.firstName),
      last_name: asString(data.lastName),
      email: asString(data.email),
      traveler_count: Array.isArray(data.travelers)
        ? data.travelers.length
        : safeNumber(data.travellerCount || data.travelerCount || data.travellersCount, 0),

      travelers: asArray(data.travelers).map((traveler) => ({
        traveler_name: `${asString(traveler.firstName)} ${asString(traveler.lastName)}`.trim(),
        first_name: asString(traveler.firstName),
        last_name: asString(traveler.lastName),
        gender: asString(traveler.gender),
        date_of_birth: toDateOnly(traveler.dob),
        nationality: asString(traveler.nationality),
        phone_full: phoneFull(traveler.phone),
        passport_number: asString(traveler.passportNumber),
        passport_issue_date: toDateOnly(traveler.passportIssueDate),
        passport_expiry: toDateOnly(traveler.passportExpiry),
        notes: asString(traveler.notes)
      })),

      visas: asArray(data.visa).map((visa) => ({
        visa_type: asString(visa.visaType),
        traveler_name: asString(visa.travelerName),
        country: asString(visa.country),
        issue_date: toDateOnly(visa.issueDate),
        expiry_date: toDateOnly(visa.expiryDate),
        status: asString(visa.status || "Pending"),
        notes: asString(visa.notes)
      })),

      hotels: asArray(data.hotels).map((hotel) => ({
        hotel_name: asString(hotel.name),
        city: asString(hotel.city),
        room_type: asString(hotel.roomType),
        meal_plan: asString(hotel.mealPlan),
        check_in: toDateOnly(hotel.checkIn),
        check_out: toDateOnly(hotel.checkOut),
        number_of_rooms: safeNumber(hotel.numberOfRooms || hotel.number_of_rooms, 1),
        notes: asString(hotel.notes)
      })),

      tickets: asArray(data.tickets).map((ticket) => ({
        flight_number: asString(ticket.flightNumber),
        airline: asString(ticket.airline),
        departure_city: asString(ticket.departure?.city || ticket.departureCity),
        arrival_city: asString(ticket.arrival?.city || ticket.arrivalCity),
        departure_date: toDateOnly(ticket.departureDate),
        arrival_date: toDateOnly(ticket.arrivalDate),
        ticket_type: asString(ticket.ticketType || "One Way"),
        notes: asString(ticket.notes)
      })),

      transports: asArray(data.transport?.segments).map((segment) => ({
        transport_route:
          asString(segment.route) ||
          `${asString(segment.from)} -> ${asString(segment.to)}`.trim(),
        transport_type: asString(segment.vehicleType || segment.transportType),
        departure_location: asString(segment.from || segment.departureLocation),
        arrival_location: asString(segment.to || segment.arrivalLocation),
        departure_time: toDateOnly(segment.date || segment.departureTime),
        arrival_time: toDateOnly(segment.arrivalTime || segment.date),
        notes: asString(segment.notes)
      })),

      providers: asArray(data.providers).map((provider) => ({
        provider_name: asString(provider.companyName || provider.providerName),
        service_type: asString(provider.serviceType),
        category: asString(provider.category),
        company_name: asString(provider.companyName),
        contact_person: asString(provider.contactPerson),
        position: asString(provider.position),
        phone_full: phoneFull(provider.phone),
        notes: asString(provider.notes)
      })),

      financial: {
        booking_id: asString(data.id),
        currency: asString(data.financial?.currency || "USD"),
        payment_date: toDateOnly(data.financial?.paymentDate),
        payment_status: asString(data.financial?.paymentStatus || "Pending"),
        client_total: safeNumber(data.financial?.clientTotal),
        client_paid: safeNumber(data.financial?.clientPaid),
        client_pending: safeNumber(data.financial?.clientPending),
        provider_total: safeNumber(data.financial?.providerTotal),
        provider_paid: safeNumber(data.financial?.providerPaid),
        provider_pending: safeNumber(data.financial?.providerPending),
        net_profit: safeNumber(data.financial?.netProfit),
        notes: asString(data.financial?.notes)
      },

      documents: buildDocuments(data, files)
    };

    const webhookResponse = await fetch(BOOKING_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bookingPayload)
    });

    const webhookResult = await parseResponse(webhookResponse);

    if (!webhookResponse.ok) {
      return res.status(500).json({
        success: false,
        message: "Webhook failed",
        ghlWebhook: webhookResult
      });
    }

    let contactResult = null;
    let contactOk = true;

    const email = asString(data.email);
    const phone = phoneFull(data.phone);

    if (email || phone) {
      try {
        const contactResponse = await fetch(CONTACTS_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.GHL_API_KEY}`,
            "Content-Type": "application/json",
            Version: "2021-07-28"
          },
          body: JSON.stringify({
            firstName: asString(data.firstName),
            lastName: asString(data.lastName),
            phone,
            email,
            locationId: process.env.GHL_LOCATION_ID
          })
        });

        contactResult = await parseResponse(contactResponse);
        contactOk = contactResponse.ok || contactResponse.status === 400;
      } catch (contactError) {
        contactOk = false;
        contactResult = { error: contactError.message };
      }
    }

    res.json({
      success: true,
      message: "Sent to GHL",
      webhookSent: true,
      contactProcessed: contactOk,
      uploadedFiles: files.length,
      ghlWebhook: webhookResult,
      ghlContact: contactResult
    });
  } catch (error) {
    console.error("Booking route error:", error);

    res.status(500).json({
      success: false,
      message: "Failed",
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running...");
});


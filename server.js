const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();

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

// ---------------- HELPERS ----------------
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

function phoneFull(phone) {
  if (!phone || typeof phone !== "object") return "";
  return `${asString(phone.code)}${asString(phone.number)}`;
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapCustomerType(value) {
  const v = asString(value).toLowerCase();
  if (["direct"].includes(v)) return "Direct";
  if (["agency", "agency partner", "referred", "reseller"].includes(v)) return "Agency";
  if (["partner", "supplier"].includes(v)) return "Partner";
  return "Direct";
}

function mapBookingStatus(value) {
  const v = asString(value).toLowerCase();
  if (v === "new") return "new";
  if (["progress", "in_progress", "in progress"].includes(v)) return "in_progress";
  if (v === "waiting") return "waiting";
  if (["done", "completed", "complete"].includes(v)) return "completed";
  return "new";
}

function mapGender(value) {
  const v = asString(value).toLowerCase();
  if (["m", "male"].includes(v)) return "Male";
  if (["f", "female"].includes(v)) return "Female";
  return "";
}

function mapServices(values) {
  const map = {
    visa: "visa",
    hotel: "hotel",
    hotels: "hotel",
    ticket: "ticket",
    tickets: "ticket",
    transportation: "transportation",
    transport: "transportation",
    umrah: "umrah",
    hajj: "hajj",
    train: "train",
    trains: "train"
  };

  const allowed = new Set([
    "visa",
    "hotel",
    "ticket",
    "transportation",
    "umrah",
    "hajj",
    "train"
  ]);

  return asArray(values)
    .map((v) => map[asString(v).toLowerCase()] || "")
    .filter((v) => allowed.has(v));
}

function mapTransportType(value) {
  const v = asString(value).toLowerCase();

  if (v.includes("bus")) return "Bus";
  if (v.includes("van")) return "Van";
  if (v.includes("train")) return "Train";
  if (v.includes("car") || v.includes("sedan") || v.includes("suv")) return "Car";

  return "Car";
}

function mapProviderPosition(value) {
  const v = asString(value).toLowerCase();

  if (v.includes("manager")) return "Manager";
  if (v.includes("sales")) return "Sales";
  if (v.includes("driver")) return "Driver";
  if (v.includes("account")) return "Accountant";

  return "Other";
}

function mapProviderServiceType(value) {
  const v = asString(value).toLowerCase();

  if (v.includes("visa")) return "Visa";
  if (v.includes("hotel")) return "Hotel";
  if (v.includes("ticket")) return "Ticket";
  if (v.includes("transport")) return "Transportation";
  if (v.includes("umrah")) return "Umrah";
  if (v.includes("hajj")) return "Hajj";
  if (v.includes("train")) return "Train";

  return "Other";
}

function mapPaymentStatus(value) {
  const v = asString(value).toLowerCase();
  if (["paid"].includes(v)) return "Paid";
  if (["partial", "partially paid"].includes(v)) return "Partial";
  return "Pending";
}

function mapVisaStatus(value) {
  const v = asString(value).toLowerCase();
  if (["approved", "approve"].includes(v)) return "Approved";
  if (["rejected", "reject", "denied"].includes(v)) return "Rejected";
  return "Pending";
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

async function parseResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

async function sendToWebhook(url, payload) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await parseResponse(response);

    return {
      ok: response.ok,
      status: response.status,
      payload,
      result
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      payload,
      result: { error: error.message }
    };
  }
}

async function sendMany(url, items) {
  const results = [];
  for (const item of items) {
    const hasUsefulData = Object.values(item).some((value) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== "" && value != null;
    });

    if (!hasUsefulData) continue;
    results.push(await sendToWebhook(url, item));
  }
  return results;
}

// ---------------- ROUTES ----------------
app.get("/", (req, res) => {
  res.send("Ideazic API is running 🚀");
});

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

    const bookingId = asString(data.id);
    const bookingCreatedAt = toDateOnly(data.createdAt);
    const customerFirstName = asString(data.firstName);
    const customerLastName = asString(data.lastName);
    const customerFullName = `${customerFirstName} ${customerLastName}`.trim();
    const customerPhoneFull = phoneFull(data.phone);
    const customerEmail = asString(data.email);
    const documents = buildDocuments(data, files);

    const bookingPayload = {
  booking_id: bookingId,
  created_at: bookingCreatedAt,
  status: mapBookingStatus(data.status),
  customer_type: mapCustomerType(data.customerType),
  services: mapServices(data.services).join(","),
  next_action: asString(data.nextAction),
  follow_up_date: toDateOnly(data.followUpDate || data.follow_up_date),
  notes: asString(data.notes),
  phone_full: customerPhoneFull,
  first_name: customerFirstName,
  last_name: customerLastName,
  email: customerEmail,
  traveler_count: Array.isArray(data.travelers)
    ? data.travelers.length
    : safeNumber(data.travellerCount || data.travelerCount || data.travellersCount, 0)
};

    const travelerPayloads = asArray(data.travelers).map((traveler) => ({
      booking_id: bookingId,
      traveler_name: `${asString(traveler.firstName)} ${asString(traveler.lastName)}`.trim(),
      first_name: asString(traveler.firstName),
      last_name: asString(traveler.lastName),
      gender: mapGender(traveler.gender),
      date_of_birth: toDateOnly(traveler.dob),
      nationality: asString(traveler.nationality),
      phone_full: phoneFull(traveler.phone),
      passport_number: asString(traveler.passportNumber),
      passport_issue_date: toDateOnly(traveler.passportIssueDate),
      passport_expiry: toDateOnly(traveler.passportExpiry),
      notes: asString(traveler.notes)
    }));

    const visaPayloads = asArray(data.visa).map((visa, index) => ({
      booking_id: bookingId,
      visa_type: asString(visa.visaType),
      traveler_name:
        asString(visa.travelerName) ||
        travelerPayloads[index]?.traveler_name ||
        customerFullName,
      country: asString(visa.country),
      issue_date: toDateOnly(visa.issueDate),
      expiry_date: toDateOnly(visa.expiryDate),
      status: mapVisaStatus(visa.status),
      notes: asString(visa.notes)
    }));

    const hotelPayloads = asArray(data.hotels).map((hotel) => ({
      booking_id: bookingId,
      hotel_name: asString(hotel.name),
      city: asString(hotel.city),
      room_type: asString(hotel.roomType),
      meal_plan: asString(hotel.mealPlan),
      check_in: toDateOnly(hotel.checkIn),
      check_out: toDateOnly(hotel.checkOut),
      number_of_rooms: safeNumber(hotel.numberOfRooms || hotel.number_of_rooms, 1),
      notes: asString(hotel.notes)
    }));

    const ticketPayloads = asArray(data.tickets).map((ticket) => ({
      booking_id: bookingId,
      flight_number: asString(ticket.flightNumber),
      airline: asString(ticket.airline),
      departure_city: asString(ticket.departure?.city || ticket.departureCity),
      arrival_city: asString(ticket.arrival?.city || ticket.arrivalCity),
      departure_date: toDateOnly(ticket.departureDate),
      arrival_date: toDateOnly(ticket.arrivalDate),
      ticket_type: asString(ticket.ticketType || "One Way"),
      notes: asString(ticket.notes)
    }));

    const transportPayloads = asArray(data.transport?.segments).map((segment) => ({
      booking_id: bookingId,
      transport_route:
        asString(segment.route) ||
        `${asString(segment.from)} -> ${asString(segment.to)}`.trim(),
      transport_type: mapTransportType(segment.vehicleType || segment.transportType),
      departure_location: asString(segment.from || segment.departureLocation),
      arrival_location: asString(segment.to || segment.arrivalLocation),
      departure_time: toDateOnly(segment.date || segment.departureTime),
      arrival_time: toDateOnly(segment.arrivalTime || segment.date),
      notes: asString(segment.notes)
    }));

    const providerPayloads = asArray(data.providers).map((provider) => ({
      booking_id: bookingId,
      provider_name: asString(provider.providerName || provider.companyName),
      service_type: mapProviderServiceType(provider.serviceType),
      category: asString(provider.category),
      company_name: asString(provider.companyName),
      contact_person: asString(provider.contactPerson),
      position: mapProviderPosition(provider.position),
      phone_full: phoneFull(provider.phone),
      notes: asString(provider.notes)
    }));

    const financialPayload = {
      booking_id: bookingId,
      currency: asString(data.financial?.currency || "USD"),
      payment_date: toDateOnly(data.financial?.paymentDate),
      payment_status: mapPaymentStatus(data.financial?.paymentStatus),
      client_total: safeNumber(data.financial?.clientTotal),
      client_paid: safeNumber(data.financial?.clientPaid),
      client_pending: safeNumber(data.financial?.clientPending),
      provider_total: safeNumber(data.financial?.providerTotal),
      provider_paid: safeNumber(data.financial?.providerPaid),
      provider_pending: safeNumber(data.financial?.providerPending),
      net_profit: safeNumber(data.financial?.netProfit),
      notes: asString(data.financial?.notes)
    };

    const documentPayloads = documents.map((doc) => ({
      booking_id: bookingId,
      document_name: asString(doc.document_name),
      document_type: asString(doc.document_type),
      related_section: asString(doc.related_section),
      related_name: asString(doc.related_name || customerFullName),
      upload_file: asString(doc.upload_file),
      document_date: toDateOnly(doc.document_date),
      notes: asString(doc.notes),
      status: asString(doc.status || "Active")
    }));

    const bookingResult = await sendToWebhook(BOOKING_WEBHOOK_URL, bookingPayload);
    const travelerResults = await sendMany(TRAVELER_WEBHOOK_URL, travelerPayloads);
    const visaResults = await sendMany(VISA_WEBHOOK_URL, visaPayloads);
    const hotelResults = await sendMany(HOTEL_WEBHOOK_URL, hotelPayloads);
    const ticketResults = await sendMany(TICKET_WEBHOOK_URL, ticketPayloads);
    const transportResults = await sendMany(TRANSPORT_WEBHOOK_URL, transportPayloads);
    const providerResults = await sendMany(PROVIDER_WEBHOOK_URL, providerPayloads);
    const financialResult = await sendToWebhook(FINANCIAL_WEBHOOK_URL, financialPayload);
    const documentResults = await sendMany(DOCUMENT_WEBHOOK_URL, documentPayloads);

    console.log("BOOKING PAYLOAD:", bookingPayload);
    console.log("BOOKING RESULT:", bookingResult);
    console.log("TRAVELERS RESULT:", travelerResults);
    console.log("VISAS RESULT:", visaResults);
    console.log("HOTELS RESULT:", hotelResults);
    console.log("TICKETS RESULT:", ticketResults);
    console.log("TRANSPORTS RESULT:", transportResults);
    console.log("PROVIDERS RESULT:", providerResults);
    console.log("FINANCIAL RESULT:", financialResult);
    console.log("DOCUMENTS RESULT:", documentResults);

    let contactResult = null;
    let contactOk = true;

    if (customerEmail || customerPhoneFull) {
      try {
        const contactResponse = await fetch(CONTACTS_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.GHL_API_KEY}`,
            "Content-Type": "application/json",
            Version: "2021-07-28"
          },
          body: JSON.stringify({
            firstName: customerFirstName,
            lastName: customerLastName,
            phone: customerPhoneFull,
            email: customerEmail,
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
      success: bookingResult.ok,
      message: "Sent to GHL webhooks",
      uploadedFiles: files.length,
      booking: bookingResult,
      travelers: travelerResults,
      visas: visaResults,
      hotels: hotelResults,
      tickets: ticketResults,
      transports: transportResults,
      providers: providerResults,
      financial: financialResult,
      documents: documentResults,
      ghlContact: contactResult,
      contactProcessed: contactOk
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

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
});

// Test route
app.get("/", (req, res) => {
  res.send("Ideazic API is running 🚀");
});

// Booking route
app.post("/booking", async (req, res) => {
  const data = req.body;

  console.log("New Booking:", data);

  try {
await fetch("https://services.leadconnectorhq.com/hooks/DQwQEDZeR14RV6YlCH1K/webhook-trigger/dc71f37a-226a-49f5-ae92-f3f48d85348a", {      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        booking_id: data.id,
        created_at: data.createdAt,
        status: data.status,
        customer_type: data.customerType,
        services: data.services,
        next_action: data.nextAction,
        notes: data.notes,
        phone_full: `${data.phone?.code || ""}${data.phone?.number || ""}`,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        traveler_count: data.travelers?.length || 0
      })
    });

    const response = await fetch("https://services.leadconnectorhq.com/contacts/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GHL_API_KEY}`,
        "Content-Type": "application/json",
        Version: "2021-07-28"
      },
      body: JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: `${data.phone?.code || ""}${data.phone?.number || ""}`,
        email: data.email,
        locationId: process.env.GHL_LOCATION_ID
      })
    });

    const result = await response.json();

    console.log("GHL Response:", result);

    res.json({
      success: true,
      message: "Sent to GHL",
      ghl: result
    });
  } catch (error) {
    console.error(error);

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

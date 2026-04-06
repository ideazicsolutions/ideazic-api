const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Ideazic API is running 🚀");
});

// Booking route
app.post("/booking", async (req, res) => {
  const data = req.body;

  console.log("New Booking:", data);

  try {
    const response = await fetch("https://services.leadconnectorhq.com/contacts/", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.GHL_API_KEY}`,
    "Content-Type": "application/json",
    "Version": "2021-07-28"
  },
  body: JSON.stringify({
    firstName: data.name,
    phone: data.phone,
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

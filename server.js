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
    const response = await fetch("https://rest.gohighlevel.com/v1/contacts/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GHL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: data.name,
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
    res.status(500).json({ error: "Failed" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running...");
});

const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Ideazic API is running 🚀");
});

// ✅ NEW: Save booking
app.post("/booking", (req, res) => {
  const data = req.body;

  console.log("New Booking:", data);

  res.json({
    success: true,
    message: "Booking received",
    data: data
  });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

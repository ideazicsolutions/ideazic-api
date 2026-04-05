const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors()); // 🔥 IMPORTANT
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Ideazic API is running 🚀");
});

app.post("/booking", (req, res) => {
  const data = req.body;

  console.log("New Booking:", data);

  res.json({
    success: true,
    message: "Booking received",
    data: data
  });
});

app.listen(3000, () => {
  console.log("Server running...");
});

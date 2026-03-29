const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Ideazic API is running 🚀");
});

app.post("/booking", (req, res) => {
  console.log("Received booking:", req.body);

  res.json({
    success: true,
    message: "Booking received",
    data: req.body,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;

require("dotenv").config();

const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");

// middleware

app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("server is running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ugpmzsn.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const appointmentOptions = client
      .db("Doctors-Appointment")
      .collection("appointmentOptions");
    // booking collenctions
    const bookingCollections = client
      .db("Doctors-Appointment")
      .collection("bookingCollections");

    app.get("/appointmentOptions", async (req, res) => {
      // console.log(date);
      const querry = {};
      const options = await appointmentOptions.find(querry).toArray();

      const date = req.query.date;
      const bookingQuery = { treatmentDate: date };
      const alreadyBooked = await bookingCollections
        .find(bookingQuery)
        .toArray();

      options.forEach((option) => {
        const serviceBooked = alreadyBooked.filter(
          (booked) => booked.treatmentName === option.name
        );
        const serviceBookedSlot = serviceBooked.map(
          (bookedService) => bookedService.slot
        );
        const remainingSlots = option.slots.filter(
          (slot) => !serviceBookedSlot.includes(slot)
        );
        option.slots = remainingSlots;
      });

      // console.log(alreadyBooked);
      res.send(options);
    });

    // post booking data api

    app.post("/bookings", async (req, res) => {
      const bookings = req.body;
      const result = await bookingCollections.insertOne(bookings);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.log());

app.listen(port, () => {
  console.log("app listening");
});

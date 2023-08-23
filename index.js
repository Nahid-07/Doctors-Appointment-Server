const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');

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

const verifyJwt =(req,res,next)=>{
  let authHeaders = req.headers.authorization;
  if(!authHeaders){
    return res.send(401).send("unauthorized access")
  }
  let token = authHeaders.split(' ')[1];
  console.log(token);
  next()
}

async function run() {
  try {
    const appointmentOptions = client
      .db("Doctors-Appointment")
      .collection("appointmentOptions");
    // booking collenctions
    const bookingCollections = client
      .db("Doctors-Appointment")
      .collection("bookingCollections");
    const usersCollections = client
      .db("Doctors-Appointment")
      .collection("usersCollections");

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

      res.send(options);
    });

    // post booking data api

    app.post("/bookings", async (req, res) => {
      const bookings = req.body;
      const query = {
        treatmentDate : bookings.treatmentDate,
        email : bookings.email,
        treatmentName : bookings.treatmentName
      }

      const oneClientBookingData = await bookingCollections.find(query).toArray();
      console.log(oneClientBookingData);
      if(oneClientBookingData.length){
        const message = `Sorry, You already have booking on ${bookings.treatmentDate}`;
        return res.send({acknowledged : false, message})
      }
      
      const result = await bookingCollections.insertOne(bookings);
     
      res.send(result);
    });

    // getting appoint via email query

    app.get("/bookings",verifyJwt, async(req, res)=>{
      const email = req.query.email;
      const query = {email : email};
      const bookings = await bookingCollections.find(query).toArray();
      res.send(bookings)
    });

    // jwt auth

    app.get('/jwt', async(req, res)=>{
      const email = req.query.email;
      const query = {email : email};
      const user = await usersCollections.findOne(query);
      if(user){
        const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '1h'});
        return res.send({accessToken: token})
      };
      res.status(403).send({accessToken : ''})
    })

    // saving user to the database
    app.post('/users', async(req,res)=>{
      const user = req.body;
      const result = await usersCollections.insertOne(user);
      res.send(result)
    }) 
  } finally {
  }
}
run().catch(console.log());

app.listen(port, () => {
  console.log("app is listening");
});

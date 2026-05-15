"use strict";

// PLEASE NOTE - The email verification API is lowkey terrible at its job
// When I fed it disposable emails off the internet, it couldn't tell the difference
// In fact, it said those emails were more legit than my actual personal email
// So when you're testing, feed it the most obviously fake emails you can

const express = require("express");
const app = express();
const path = require("path");
const portNumber = 7000;
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion} = require("mongodb");
const mongoose = require("mongoose");

console.log(`Web server started and running at http://localhost:${portNumber}`);

const applicationSchema = new mongoose.Schema({
   name: String,
   email: String,
   number: String,
   choice: String,
   message: String
});
const Application = mongoose.model("Application", applicationSchema);

// require("dotenv").config({
//    path: path.resolve(__dirname, "credentialsDontPost/.env"),
// });


// MANDATORY use of router
const router1 = express.Router(); 
const router2 = express.Router(); 
const router3 = express.Router();
const router4 = express.Router();

const databaseName = "CMSC335DB";
const collectionName = "petitionCollection";
const uri = process.env.MONGO_CONNECTION_STRING;
const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1});

mongoose.connect(uri)
   .then(() => console.log("Connected to MongoDB"))
   .catch(err => console.error(err));

app.set("views", path.resolve(__dirname, "Templates"));
app.use(express.static("media"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));

router1.get("/", async (request, response) => {
   response.render("index");
});

router2.get("/signup", async (request, response) => {
   response.render("signup",{portNum:portNumber});
});

router2.post("/signup", async (request, response) => {
   try {

      let {name, email, number, choice, message} = request.body;

      // function responsible for API call to Mailbox
      async function validateEmail(emailToCheck) {
         const url = `http://apilayer.net/api/check?access_key=${MAILBOX_CONNECTION_STRING}&email=${emailToCheck}`;

         try {
            const apiResponse = await fetch(url);
            const data = await apiResponse.json();
            console.log("EMAIL API RESPONSE:", data);

            if (data.disposable || !data.format_valid || !data.smtp_check || !data.mx_found) {
               let err = `You sent a fake/disposable/nonworking email. Your signature is not counted.`;
               response.render("signup_failure", {err:err});
            }
            else if (data.score <= 0.3) {
               let err = `The validation service has deemed this email unreliable. Your signature is not counted`;
               response.render("signup_failure", {err:err});
            }
            else {
               response.render("signup_display", {
                  score: data.score,
                  name: name,
                  email: email,
                  number: number,
                  choice: choice,
                  message: message
               });

               const application = new Application({
                  name: name,
                  email: email,
                  number: number,
                  choice: choice,
                  message: message
               });
               console.log(data.score);
               await application.save();
            }
         }
         catch (error) {
            console.error("Error:", error);
         }
      }

      await validateEmail(email);

   }
   catch (e) {
      console.error(e);
   }
});

router3.get("/petitioners", async (request, response) => {
   try {
         const applications = await Application.find().lean();
         let table="";
         applications.forEach((element) => {
            table+=`Name: ${element.name} - "${element.message}" <br>`;
         });

         response.render("petitioners", {table:table});
      }
      catch (err) {
         console.error(err);
      }
   }
);

router4.get("/clear", async (request, response) => {
      try {
         response.render("clear");
         await Application.deleteMany({});
      }
      catch (err) {
            console.error(err);
      }
   }
);

app.listen(portNumber);
app.use(router1);
app.use(router2);
app.use(router3);
app.use(router4);



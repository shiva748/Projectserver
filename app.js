require("dotenv").config();
// imports

const express = require("express");
const port = 3005 || process.env.PORT;
const Routes = require("./Route/Routes");
const bodyParser = require("body-parser");
// initialize
const app = express();

require("./Database/connection");

app.use(bodyParser.json());

app.use("/", Routes);

app.listen(port, () => {
  console.log(`listining to port ${port}`);
});

const express = require("express");
const Router = express.Router();
const {
  search,
  distance,
  signup,
  verifyOTP,
  login,
  authenticate,
  logout,
  citysearch,
  getRates,
  updateCity,
} = require("../Controller/controller");
const verifyToken = require("../Middleware/auth");

Router.get("/", (req, res) => {
  res.json({ message: "we are live" });
});

Router.post("/login", login);

Router.post("/register", signup);

Router.post("/verify-otp", verifyOTP);

Router.post("/search", verifyToken, search);

Router.post("/search-city", verifyToken, citysearch);

Router.post("/calculate-distance", verifyToken, distance);

Router.post("/get-rates", verifyToken, getRates);

Router.post("/authenticate", verifyToken, authenticate);

Router.post("/logout", verifyToken, logout);

Router.post("/update-city", verifyToken, updateCity);

module.exports = Router;

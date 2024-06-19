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
  registerOperator,
  OperatorProfile,
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

Router.get("/get-rates", verifyToken, getRates);

Router.get("/authenticate", verifyToken, authenticate);

Router.get("/logout", verifyToken, logout);

Router.post("/update-city", verifyToken, updateCity);

Router.post("/operator-registration", verifyToken, registerOperator);

Router.get("/Operator/profile", verifyToken, OperatorProfile);

module.exports = Router;

require("dotenv").config();
// imports

const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const port = 3005 || process.env.PORT;
const Routes = require("./Route/Routes");
const bodyParser = require("body-parser");
const { clientvalidate, partnervalidate } = require("./Middleware/socketauth");
// initialize
const app = express();

require("./Database/connection");

app.use(bodyParser.json());

app.use("/", Routes);

const server = createServer(app);
const io = new Server(server);

// === === === client socket === === === //

const clientio = io.of("/clients");
clientio.use(clientvalidate);

const clients = new Map();

clientio.on("connection", (socket) => {
  if (!socket.user.success) {
    socket.emit("unauthorized", "can't validate your token");
    socket.disconnect();
    console.log("invalid connection request");
    return;
  }
  console.log("client connected");
  console.log("ID ", socket.id);
  clients.set(socket.user.UserId, socket.id);
  socket.on("disconnect", () => {
    console.log(`client ${socket.id} disconnected`);
    clients.delete(socket.user.UserId);
  });
});

// === === === partner socket === === === //

const partnerio = io.of("/partner");

const partners = new Map();

partnerio.on("connection", (socket) => {
  if (!socket.user.success) {
    socket.emit("unauthorized", "can't validate your token");
    socket.disconnect();
    console.log("invalid connection request");
    return;
  }
  console.log("partner connected");
  console.log("ID ", socket.id);
  partners.set(socket.user.UserId, socket.id);
  socket.on("disconnect", () => {
    console.log(`partner ${socket.id} disconnected`);
    partners.delete(socket.user.UserId);
  });
});

server.listen(port, () => {
  console.log(`listining to port ${port}`);
});

module.exports = { clientio, partnerio, clients, partners };

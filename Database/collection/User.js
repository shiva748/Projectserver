const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const jwt = require("jsonwebtoken");
const Bcrypt = require("bcryptjs");

// Define the City schema
const citySchema = new Schema({
  description: {
    type: String,
  },
  longitude: {
    type: Number,
  },
  latitude: {
    type: Number,
  },
  place_id: {
    type: String,
  },
});

// Define the User schema
const userSchema = new Schema({
  UserId: {
    type: String,
    unique: true,
    required: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  Name: {
    type: String,
    required: true,
    trim: true,
  },
  Password: {
    type: String,
    required: true,
    minlength: 8,
  },
  PhoneNo: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  EmailId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: /^\S+@\S+\.\S+$/,
  },
  tokens: [
    {
      token: {
        type: String,
      },
      expire: {
        type: Number,
      },
    },
  ],
  City: citySchema, // Embed the City schema
});

// Middleware to hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("Password")) {
    this.Password = await Bcrypt.hash(this.Password, 12);
  }
  next();
});

// Method to generate authentication token
userSchema.methods.genrateauth = async function () {
  try {
    let token = jwt.sign({ UserId: this.UserId }, process.env.KEY, {
      expiresIn: "14 days",
    });
    this.tokens.push({
      token,
      expire: new Date().getTime() + 1209600000,
    });
    await this.save();
    return token;
  } catch (error) {
    throw error;
  }
};

const User = mongoose.model("User", userSchema);

module.exports = User;

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const citySchema = new Schema({
  description: {
    type: String,
  },
  longitude: {
    type: Number,
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  place_id: {
    type: String,
    required: true,
  },
});

const operatorSchema = new Schema(
  {
    OperatorId: {
      type: String,
      unique: true,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    FirstName: {
      type: String,
      required: true,
      trim: true,
    },
    LastName: {
      type: String,
      required: true,
      trim: true,
    },
    Status: {
      type: String,
      enum: ["pending", "verified", "active", "suspended"],
      default: "pending",
      required: true,
    },
    City: {
      type: citySchema,
    },
    Dob: {
      type: Date,
      required: true,
    },
    AadhaarCard: {
      Number: {
        type: String,
        required: true,
        trim: true,
      },
      FrontImage: {
        type: String,
        required: true,
      },
      BackImage: {
        type: String,
        required: true,
      },
    },
    EmergencyNumber: {
      type: String,
      trim: true,
      match: /^[0-9]{10}$/,
    },
    Profile: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Operator model
const Operator = mongoose.model("Operator", operatorSchema);

module.exports = Operator;

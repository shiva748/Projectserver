const mongoose = require("mongoose");
const Schema = mongoose.Schema;

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
    Name: {
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
      description: {
        type: String,
      },
      location: {
        type: {
          type: String,
          enum: ["Point"],
        },
        coordinates: {
          type: [Number],
        },
      },
      place_id: {
        type: String,
      },
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

// Create geospatial index on the 'City.location' field
operatorSchema.index({ "City.location": "2dsphere" });

// Operator model
const Operator = mongoose.model("Operator", operatorSchema);

module.exports = Operator;

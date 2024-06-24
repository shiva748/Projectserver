const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const driverSchema = new Schema(
  {
    DriverId: {
      type: String,
      required: true,
      unique: true,
    },
    UserId: {
      type: String,
      required: true,
    },
    OperatorId: {
      type: String,
      required: true,
    },
    Name: {
      type: String,
      required: true,
      trim: true,
    },
    Dob: {
      type: String,
      required: true,
    },
    PhoneNo: {
      type: String,
      required: true,
    },
    Profile: {
      type: String,
      required: true,
    },
    Status: {
      type: String,
      required: true,
      enum: ["pending", "verified", "suspended", "unlinked"],
      default: "pending",
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
    DrivingLicence: {
      Number: {
        type: String,
        required: true,
        trim: true,
      },
      Expiry: {
        type: String,
        required: true,
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
  },
  { timestamps: true }
);

const Driver = mongoose.model("Driver", driverSchema);

module.exports = Driver;

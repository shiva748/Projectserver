const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const driverSchema = new Schema(
  {
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
    EmailId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^\S+@\S+\.\S+$/,
    },
    PhoneNo: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      match: /^[0-9]{10}$/,
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
        type: Date,
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

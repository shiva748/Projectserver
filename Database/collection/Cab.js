const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cabSchema = new Schema(
  {
    Manufacturer: {
      type: String,
      required: true,
      trim: true,
    },
    Model: {
      type: String,
      required: true,
      trim: true,
    },
    CabNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    Photo: {
      type: String,
      required: true,
    },
    RegistrationCertificate: {
      FrontPhoto: {
        type: String,
        required: true,
      },
      BackPhoto: {
        type: String,
        required: true,
      },
      ProductionYear: {
        type: Number,
        required: true,
      },
    },
    Permit: {
      PartA: {
        type: String,
        required: true,
      },
      PartB: {
        type: String,
        required: true,
      },
      OtherPermit: {
        type: String,
      },
    },
    Operator: {
      type: Schema.Types.ObjectId,
      ref: "Operator",
      required: true,
    },
    Status: {
      type: String,
      enum: ["pending", "verified", "suspended"],
      default: "pending",
      required: true,
    },
  },
  { timestamps: true }
);

const Cab = mongoose.model("Cab", cabSchema);

module.exports = Cab;

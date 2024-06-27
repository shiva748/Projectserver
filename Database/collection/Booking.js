const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BookingSchema = new Schema({
  From: {
    description: {
      type: String,
      required: true,
    },
    place_id: {
      type: String,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
  },
  To: {
    description: {
      type: String,
    },
    place_id: {
      type: String,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
      },
    },
  },
  Status: {
    type: String,
    enum: ["pending", "confirmed", "ongoing", "completed", "cancelled"],
    default: "pending",
    required: true,
  },
  Date: {
    type: Date,
    required: true,
  },
  Category: {
    type: String,
    enum: ["Micro", "Sedan", "MUV", "SUV"],
    required: true,
  },
  TripType: {
    type: String,
    enum: ["Oneway", "Roundtrip", "Rental"],
    required: true,
  },
  Offer: {
    type: Number,
    required: true,
  },
  Hour: {
    type: Number,
    required: true,
  },
  Km: {
    type: Number,
    required: true,
  },
  UserId: {
    type: String,
    required: true,
  },
  Bids: [
    {
      OperatorId: {
        type: String,
      },
      Offer: {
        type: Number,
      },
      CabId: {
        type: String,
      },
      DriverId: {
        type: String,
      },
    },
  ],
  AcceptedBid: {
    OperatorId: {
      type: String,
    },
    Offer: {
      type: Number,
    },
    CabId: {
      type: String,
    },
    DriverId: {
      type: String,
    },
  },
  CabDetails: {
    CabId: {
      type: String,
    },
    Number: {
      type: String,
    },
    Model: {
      type: String,
    },
  },
  DriverDetails: {
    DriverId: {
      type: String,
    },
    Name: {
      type: String,
    },
    Number: {
      type: String,
      trim: true,
      match: /^[0-9]{10}$/,
    },
  },
  Billing: {
    Otp: {
      Start: {
        type: String,
      },
      End: {
        type: String,
      },
    },
    StartTime: {
      type: Date,
    },
    EndTime: {
      type: Date,
    },
    StartKm: {
      type: Number,
    },
    EndKm: {
      type: Number,
    },
    FinalAmount: {
      type: Number,
    },
  },
});

BookingSchema.index({ "from.location": "2dsphere" });
BookingSchema.index({ "to.location": "2dsphere" });

const Booking = mongoose.model("Booking", BookingSchema);

module.exports = Booking;

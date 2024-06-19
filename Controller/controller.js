const validator = require("validator");
const User = require("../Database/collection/User");
const TempUser = require("../Database/collection/TempUser");
const Bcrypt = require("bcryptjs");
const { sendOTP, verifyOTP } = require("otpless-node-js-auth-sdk");
const uniqid = require("uniqid");
const { getCurrentRates } = require("./multiplier/fare");
exports.login = async (req, res) => {
  try {
    console.log("HI");
    const { EmailId, PhoneNo, Password } = req.body;
    let filter = {};
    console.log(EmailId, PhoneNo, Password);
    if (!EmailId && !PhoneNo) {
      const error = new Error("either Email or PhoneNo is required");
      error.status = 400;
      throw error;
    }
    if (EmailId) {
      if (!validator.isEmail(EmailId)) {
        const error = new Error("Invalid Credentials");
        error.status = 400;
        throw error;
      }
      filter.EmailId = EmailId.toLowerCase();
    }
    if (PhoneNo) {
      if (!validator.isMobilePhone(PhoneNo, "en-IN")) {
        const error = new Error("Invalid Credentials");
        error.status = 400;
        throw error;
      }
      filter.PhoneNo = "+91" + PhoneNo;
    }

    if (!validator.isLength(Password, { min: 9, max: 50 })) {
      const error = new Error("Invalid Credentials");
      error.status = 400;
      throw error;
    }
    const user = await User.findOne(filter);
    if (!user) {
      const error = new Error("Invalid Credentials");
      error.status = 400;
      throw error;
    }
    let compare = await Bcrypt.compare(Password, user.Password);
    if (compare) {
      let token = await user.genrateauth(user);
      res.status(200).json({
        success: true,
        token,
        validity: new Date(new Date().getTime() + 1209600000),
        message: "Login Successful",
        data: {
          Name: user.Name,
          EmailId: user.EmailId,
          PhoneNo: user.PhoneNo,
          City: user.City,
        },
      });
    } else {
      const error = new Error("Invalid Credentials");
      error.status = 400;
      throw error;
    }
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal Server Error" });
  }
};

exports.signup = async (req, res) => {
  try {
    let { EmailId, Name, PhoneNo, Password, CPassword } = req.body;

    if (!validator.isEmail(EmailId)) {
      throw new Error("Please enter a valid email");
    }

    if (!validator.isLength(Name, { min: 3, max: 50 })) {
      throw new Error("Name should be between 3 and 50 characters long");
    }

    if (!validator.isMobilePhone(PhoneNo, "en-IN")) {
      throw new Error("Please enter a valid phone number");
    }
    if (!validator.isLength(PhoneNo, { min: 10, max: 10 })) {
      throw new Error("Please enter a valid phone number without country code");
    }
    if (Password !== CPassword) {
      throw new Error("Passwords do not match");
    }

    if (!validator.isLength(Password, { min: 9, max: 50 })) {
      throw new Error("Password should be at least 9 to 50 characters long");
    }
    const existingUser = await User.findOne({
      $or: [{ EmailId: EmailId.toLowerCase() }, { PhoneNo: "+91" + PhoneNo }],
    });
    if (existingUser) {
      throw new Error("User with given email or phone number already exists");
    }
    await TempUser.findOneAndDelete({
      $or: [{ EmailId: EmailId.toLowerCase() }, { PhoneNo: "+91" + PhoneNo }],
    });

    let OtpId = uniqid("Otp-");
    const tempUser = new TempUser({
      Name,
      Password,
      PhoneNo: "+91" + PhoneNo,
      EmailId: EmailId.toLowerCase(),
      OtpId,
      OTPExpires: new Date().getTime() + 900 * 1000,
    });

    let result = await tempUser.save();
    let response = await sendOTP(
      "+91" + PhoneNo,
      EmailId.toLowerCase(),
      "",
      "",
      OtpId,
      900,
      "6",
      process.env.OTPCLIENT,
      process.env.OTPSECRET
    );
    if (response.success || !response.errorMessage) {
      res.status(200).json({
        success: true,
        message: "OTP sent to your Phone Number. Please verify your account.",
      });
    } else {
      throw new Error("Failed to send Otp for verification");
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { EmailId, PhoneNo, OTP } = req.body;
    if (!validator.isEmail(EmailId)) {
      throw new Error("Please enter a valid email");
    }
    if (!validator.isMobilePhone(PhoneNo, "en-IN")) {
      throw new Error("Please enter a valid phone number");
    }
    if (!validator.isLength(PhoneNo, { min: 10, max: 10 })) {
      throw new Error("Please enter a valid phone number without country code");
    }
    if (!validator.isLength(OTP, { min: 4, max: 6 })) {
      throw new Error("Please enter a valid OTP");
    }
    const tempUser = await TempUser.findOne({
      EmailId: EmailId.toLowerCase(),
      PhoneNo: "+91" + PhoneNo,
    });
    let curtime = new Date().getTime();
    if (!tempUser || tempUser.OTPExpires < curtime) {
      throw new Error("Invalid or expired OTP");
    }
    const existingUser = await User.findOne({
      $or: [
        { EmailId: tempUser.EmailId.toLowerCase() },
        { PhoneNo: tempUser.PhoneNo },
      ],
    });

    if (existingUser) {
      throw new Error("User with given email or phone number already exists");
    }

    const verify = await verifyOTP(
      tempUser.EmailId,
      tempUser.PhoneNo,
      tempUser.OtpId,
      OTP,
      process.env.OTPCLIENT,
      process.env.OTPSECRET
    );
    if (verify.isOTPVerified && !verify.errorMessage) {
      const user = new User({
        UserId: uniqid("User-"),
        Name: tempUser.Name,
        Password: tempUser.Password,
        PhoneNo: tempUser.PhoneNo,
        EmailId: tempUser.EmailId.toLowerCase(),
        verified: true,
      });

      await user.save();
      let token = await user.genrateauth(user);

      await TempUser.deleteOne({ EmailId: tempUser.EmailId });

      res.status(200).json({
        success: true,
        token,
        validity: new Date(new Date().getTime() + 1209600000),
        message: "Registration Successfull",
        data: {
          Name: user.Name,
          EmailId: user.EmailId,
          PhoneNo: user.PhoneNo,
          City: user.City,
        },
      });
    } else {
      throw new Error("Please enter a valid OTP");
    }
  } catch (error) {
    res.status(400).json({ message: error.message || "Internal Server Error" });
  }
};

exports.authenticate = async (req, res) => {
  try {
    let user = req.user;
    res.status(200).json({
      success: true,
      data: {
        UserId: user.UserId,
        Name: user.Name,
        PhoneNo: user.PhoneNo,
        EmailId: user.EmailId,
        City: user.City,
        Operator: user.Operator,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// === === === search === === === //
const { LRUCache } = require("lru-cache");
const fs = require("fs");
const cacheFilePath = "./cache/cache.json";
let cache;

try {
  const cachedData = fs.readFileSync(cacheFilePath);
  const parsedCache = JSON.parse(cachedData);
  cache = new LRUCache({ max: 400000 });
  Object.entries(parsedCache).forEach(([key, value]) => {
    cache.set(value[0], value[1].value);
  });
  console.log("place Cache loaded from file.");
} catch (error) {
  console.error("Error loading cache:", error);
  cache = new LRUCache({ max: 400000 });
}

exports.search = async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).send({ error: "Search query is required" });
  }

  const cachedResult = cache.get(query.toLowerCase());
  if (cachedResult) {
    console.log(`Found result in cache for query: ${query}`);
    return res.send(cachedResult);
  }
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&key=${process.env.GOOGLE}&components=country:IN&types=geocode`
    );
    const data = await response.json();

    const predictions = data.predictions.map((prediction) => ({
      description: prediction.description,
      place_id: prediction.place_id,
    }));

    console.log(`Adding result to cache for query: ${query}`);
    cache.set(query.toLowerCase(), predictions);

    res.send(predictions);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send({ error: "An error occurred while searching for places" });
  }
};

// Save cache to file before process exit
const saveCacheToFile = () => {
  try {
    const dump = cache.dump();
    fs.writeFileSync(cacheFilePath, JSON.stringify(dump));
    console.log("Cache saved to file.");
  } catch (error) {
    console.error("Error saving cache:", error);
  }
};

// Handle process exit event
process.on("exit", saveCacheToFile);

// Handle process termination signals
["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
  process.on(signal, () => {
    saveCacheToFile();
    process.exit();
  });
});

// === === === search city === === === //
const citycacheFilePath = "./cache/citycache.json";
let citycache;

try {
  const cachedData = fs.readFileSync(citycacheFilePath);
  const parsedCache = JSON.parse(cachedData);
  citycache = new LRUCache({ max: 400000 });
  Object.entries(parsedCache).forEach(([key, value]) => {
    citycache.set(value[0], value[1].value);
  });
  console.log("place city Cache loaded from file.");
} catch (error) {
  console.error("Error loading cache:", error);
  citycache = new LRUCache({ max: 400000 });
}

exports.citysearch = async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).send({ error: "Search query is required" });
  }

  const cachedResult = citycache.get(query.toLowerCase());
  if (cachedResult) {
    console.log(`Found result in cache for query: ${query}`);
    return res.send(cachedResult);
  }
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&key=${process.env.GOOGLE}&components=country:IN&types=(cities)`
    );
    const data = await response.json();

    const predictions = data.predictions.map((prediction) => ({
      description: prediction.description,
      place_id: prediction.place_id,
    }));

    console.log(`Adding result to cache for query: ${query}`);
    citycache.set(query.toLowerCase(), predictions);

    res.send(predictions);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send({ error: "An error occurred while searching for cities" });
  }
};

// Save cache to file before process exit
const savecityCacheToFile = () => {
  try {
    const dump = citycache.dump();
    fs.writeFileSync(citycacheFilePath, JSON.stringify(dump));
    console.log("city Cache saved to file.");
  } catch (error) {
    console.error("Error saving cache:", error);
  }
};

// Handle process exit event
process.on("exit", savecityCacheToFile);

// Handle process termination signals
["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
  process.on(signal, () => {
    savecityCacheToFile();
    process.exit();
  });
});

// === === === distance === === === //
const distancecache = "./cache/d_cache.json";

let d_cache;

try {
  const cachedData = fs.readFileSync(distancecache);
  const parsedCache = JSON.parse(cachedData);
  d_cache = new LRUCache({ max: 800000 });
  Object.entries(parsedCache).forEach(([key, value]) => {
    d_cache.set(value[0], value[1].value);
  });
  console.log("distance cache loaded from file.");
} catch (error) {
  console.log("Error loading cache:", error);
  d_cache = new LRUCache({ max: 800000 });
}

exports.distance = async (req, res) => {
  try {
    const { places } = req.body;
    if (!places || places.length != 2) {
      return res.status(400).json({
        error: "two places are required to calculate distance",
      });
    }

    const cachedResult =
      d_cache.get(`${places[0].place_id}${places[1].place_id}`) ||
      d_cache.get(`${places[1].place_id}${places[0].place_id}`);
    if (cachedResult) {
      console.log(`Found result in cache for query`);
      return res.send({ ...cachedResult, rates: getCurrentRates() });
    }
    const origin = {
      placeId: places[0].place_id,
    };

    const destination = {
      placeId: places[1].place_id,
    };

    const requestBody = {
      origin,
      destination,
      travelMode: "DRIVE",
      languageCode: "en-US",
      units: "IMPERIAL",
    };

    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }
    data.routes[0].polyline = null;
    d_cache.set(`${places[0].place_id}${places[1].place_id}`, data.routes[0]);
    res.json({ ...data.routes[0], rates: getCurrentRates() });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while processing the request" });
  }
};

// Save cache to file before process exit
const savedCacheToFile = () => {
  try {
    const dump = d_cache.dump();
    fs.writeFileSync(distancecache, JSON.stringify(dump));
    console.log("distance Cache saved to file.");
  } catch (error) {
    console.error("Error saving cache:", error);
  }
};

// Handle process exit event
process.on("exit", savedCacheToFile);

// Handle process termination signals
["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
  process.on(signal, () => {
    savedCacheToFile();
    process.exit();
  });
});

// === === === Rates === === === //

exports.getRates = async (req, res) => {
  try {
    res.json({ rates: getCurrentRates() });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// === === === logout === === === //

exports.logout = async (req, res) => {
  try {
    const { UserId, tokens } = req.user;
    const token = req.token;
    let updated = tokens.filter((itm) => itm.token != token);
    console.log(updated);
    await User.updateOne({ UserId }, { tokens: updated });
    res.status(200).json({ success: true, message: "Looged out" });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// === === === longitude & latitude === === === //

// async function getLatLong(placeId) {
//   const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${process.env.GOOGLE}`;
//   try {
//     if (!placeId) {
//       if (!response.ok) {
//         throw new Error(`please provide a placeId`);
//       }
//     }
//     const response = await fetch(url);
//     if (!response.ok) {
//       throw new Error(`HTTP error! Status: ${response.status}`);
//     }
//     const data = await response.json();
//     const result = data.result;
//     if (result) {
//       const location = result.geometry.location;
//       return {
//         latitude: location.lat,
//         longitude: location.lng,
//         description: result.formatted_address,
//         place_id: result.place_id,
//       };
//     } else {
//       throw new Error("No result found for the provided place_id.");
//     }
//   } catch (error) {
//     console.error("Error fetching location:", error);
//     return null;
//   }
// }
async function getLatLong(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${process.env.GOOGLE}`;
  try {
    if (!address) {
      throw new Error("Please provide an address");
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
        description: data.results[0].formatted_address,
        place_id: data.results[0].place_id,
      };
    } else {
      throw new Error("No result found for the provided address.");
    }
  } catch (error) {
    console.error("Error fetching location from Google Maps:", error);
    return null;
  }
}
exports.updateCity = async (req, res) => {
  try {
    let { City } = req.body;
    if (!City) {
      throw new Error("Please select a city from list");
    } else if (!City.place_id) {
      throw new Error("Please select a city from list");
    }
    let user = req.user;
    let lola = await getLatLong(City.description);
    let result = await User.updateOne({ UserId: user.UserId }, { City: lola });
    res.status(200).json({
      success: true,
      message: "City updated successfully",
      City: lola,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// === === === Register as operator === === === //

const { busboyPromise } = require("../busboy/busboy");
const { saveFilesToFolder, cleanupFiles } = require("../busboy/savefile");
const path = require("path");
const Operator = require("../Database/collection/Operator");

exports.registerOperator = async (req, res) => {
  try {
    const user = req.user;
    if (user.Operator && user.Operator.OperatorId) {
      throw new Error(`You already have a Operator profile`);
    }
    const { fields, files } = await busboyPromise(req);

    ["AadhaarFront", "AadhaarRear", "Profile"].forEach((itm) => {
      if (!files[itm]) {
        throw new Error(`Please select a ${itm} image`);
      }
    });

    const requiredFields = [
      {
        key: "FirstName",
        validator: (value) => validator.isLength(value, { min: 3, max: 20 }),
        message: "First name must be 3 to 20 characters long",
      },
      {
        key: "LastName",
        validator: (value) => validator.isLength(value, { min: 3, max: 20 }),
        message: "Last name must be 3 to 20 characters long",
      },
      {
        key: "Dob",
        validator: (value) => !!value,
        message: "Please enter your date of birth",
      },
      {
        key: "AadhaarNumber",
        validator: (value) => validator.isLength(value, { min: 12, max: 12 }),
        message: "Aadhaar number must be exactly 12 digits long",
      },
      {
        key: "EmergencyNumber",
        validator: (value) => validator.isMobilePhone(value, "en-IN"),
        message: "Please enter a valid Indian mobile number",
      },
    ];

    const isAdult = (dob) => {
      const currentDate = new Date();
      const dobDate = new Date(dob);
      const ageDifference = currentDate - dobDate;
      const age = Math.floor(ageDifference / (1000 * 60 * 60 * 24 * 365.25));
      return age >= 18;
    };

    requiredFields.push({
      key: "Dob",
      validator: (value) => isAdult(value),
      message: "You must be at least 18 years old",
    });

    requiredFields.forEach(({ key, validator, message }) => {
      if (!fields[key]) {
        throw new Error(`Please enter your ${key}`);
      }
      if (validator && !validator(fields[key])) {
        throw new Error(`${message}`);
      }
    });
    if (user.PhoneNo === `+91${fields.EmergencyNumber}`) {
      throw new Error("Please provide a different emergency contact number");
    }
    const id = "Operator-" + user.UserId.slice(5, user.UserId.length);
    let folderPath = path.join(__dirname, "../files/operator", id);
    let filesave;
    try {
      filesave = await saveFilesToFolder(files, folderPath);
    } catch (error) {
      cleanupFiles(folderPath);
      throw error;
    }

    const operator = new Operator({
      OperatorId: id,
      FirstName: fields.FirstName,
      LastName: fields.LastName,
      City: user.City,
      Dob: fields.Dob,
      AadhaarCard: {
        Number: fields.AadhaarNumber,
        FrontImage: filesave.AadhaarFront,
        BackImage: filesave.AadhaarRear,
      },
      EmergencyNumber: fields.EmergencyNumber,
      Profile: filesave.Profile,
    });
    try {
      const result = await operator.save();
      const update = await User.updateOne(
        { UserId: user.UserId },
        {
          Operator: {
            OperatorId: id,
            Status: "pending",
            verified: false,
          },
        }
      );
      res
        .status(201)
        .json({ message: "Operator profile successfully created." });
    } catch (error) {
      cleanupFiles(folderPath);
      throw error;
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// === === === get Operator Profile === === === //

exports.OperatorProfile = async (req, res) => {
  try {
    const user = req.user;
    const id = "Operator-" + user.UserId.slice(5, user.UserId.length);
    let operator = await Operator.findOne({ OperatorId: id });
    if (operator) {
      res.status(200).json({ success: true, data: operator });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid request no operator profile found",
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

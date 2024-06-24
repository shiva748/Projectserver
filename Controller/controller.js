const validator = require("validator");
const User = require("../Database/collection/User");
const TempUser = require("../Database/collection/TempUser");
const Bcrypt = require("bcryptjs");
const { sendOTP, verifyOTP } = require("otpless-node-js-auth-sdk");
const uniqid = require("uniqid");
const { getCurrentRates } = require("./multiplier/fare");
const Driver = require("../Database/collection/Driver");
exports.login = async (req, res) => {
  try {
    const { EmailId, PhoneNo, Password } = req.body;
    let filter = {};
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
const {
  saveFilesToFolder,
  cleanupFiles,
  copyRecursive,
} = require("../busboy/savefile");
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
    if (files.length > 3) {
      throw new Error("Invalid request");
    }
    const requiredFields = [
      {
        key: "Name",
        validator: (value) => validator.isLength(value, { min: 3, max: 20 }),
        message: "Name must be 3 to 20 characters long",
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
    requiredFields.forEach(({ key, validator, message }) => {
      if (!fields[key]) {
        throw new Error(`Please enter your ${key}`);
      }
      if (validator && !validator(fields[key])) {
        throw new Error(`${message}`);
      }
    });
    const dobPattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (!dobPattern.test(fields.Dob)) {
      throw new Error("Dob must be in format DD/MM/YYYY.");
    }

    const [day, month, year] = fields.Dob.split("/").map(Number);
    const dob = new Date(year, month - 1, day);

    const age = new Date().getFullYear() - dob.getFullYear();
    const monthDifference = new Date().getMonth() - dob.getMonth();
    const dayDifference = new Date().getDate() - dob.getDate();

    if (
      age < 18 ||
      (age === 18 &&
        (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)))
    ) {
      throw new Error("User must be at least 18 years old.");
    }

    if (user.PhoneNo === `+91${fields.EmergencyNumber}`) {
      throw new Error("Please provide a different emergency contact number");
    }

    if (!fields.City) {
      throw new Error("Please Select a City");
    }
    fields.City = JSON.parse(fields.City);
    if (!fields.City.place_id || !fields.City.description) {
      throw new Error("Please Select a City");
    }
    fields.City = await getLatLong(fields.City.description);
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
      Name: fields.Name,
      City: user.City,
      Dob: fields.Dob,
      AadhaarCard: {
        Number: fields.AadhaarNumber,
        FrontImage: filesave.AadhaarFront,
        BackImage: filesave.AadhaarRear,
      },
      EmergencyNumber: fields.EmergencyNumber,
      Profile: filesave.Profile,
      City: fields.City,
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
      res.status(201).json({
        success: true,
        message: "Operator profile successfully created.",
        Operator: {
          OperatorId: id,
          Status: "pending",
          verified: false,
        },
      });
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

// === === === Operator Image === === === //

exports.OperatorImage = async (req, res) => {
  try {
    const { OperatorId } = req.params;
    let operator = await Operator.findOne({ OperatorId: OperatorId });
    let filePath = path.join(
      __dirname,
      `../files/operator/${OperatorId}/${operator.Profile}`
    );

    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, `../files/NoProfile.png`);
    }
    return res.status(200).sendFile(filePath);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// === === === Search for Driver === === === //

exports.SearchDriver = async (req, res) => {
  try {
    let user = req.user;
    if (!user.Operator || !user.Operator.verified) {
      return res
        .status(401)
        .json({ success: false, message: "unauthorized access" });
    }
    let { EmailId, PhoneNo } = req.body;
    if (!EmailId || !PhoneNo) {
      throw new Error("Please Enter Both EmailId and PhoneNo");
    }
    if (!validator.isEmail(EmailId)) {
      throw new Error("Please enter a valid EmailId");
    }
    if (
      !validator.isMobilePhone(PhoneNo, "en-IN") ||
      !validator.isLength(PhoneNo, { min: 10, max: 10 })
    ) {
      throw new Error("Please enter a valid 10 digit PhoneNo");
    }
    const driver = await User.findOne({
      EmailId: EmailId.toLowerCase(),
      PhoneNo: "+91" + PhoneNo,
    });
    if (driver) {
      res.status(200).json({
        success: true,
        message: "Found a profile",
        data: { Name: driver.Name, UserId: driver.UserId },
      });
    } else {
      throw new Error("No Profile Found");
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// === === === Register a Driver === === === //

const isValidFutureDate = (dateString) => {
  const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
  if (!datePattern.test(dateString)) {
    throw new Error("Date must be in format DD/MM/YYYY.");
  }

  const [day, month, year] = dateString.split("/").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) {
    throw new Error("Invalid date.");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date < today) {
    throw new Error("DL is Expired");
  }

  return true;
};

exports.RegisterDriver = async (req, res) => {
  try {
    const user = req.user;
    if (!user.Operator || !user.Operator.verified) {
      return res
        .status(401)
        .json({ success: false, message: "unauthorized access" });
    }
    const { fields, files } = await busboyPromise(req);
    let {
      Name,
      Dob,
      AadhaarNumber,
      DLNumber,
      DLValidity,
      PhoneNo,
      EmailId,
      IsDriver,
    } = fields;
    if (IsDriver === undefined) {
      throw new Error("IsDriver field in required");
    }
    const throwValidationError = (message) => {
      throw new Error(message);
    };

    if (IsDriver === "true") {
      if (files.length > 2) {
        throwValidationError("Invalid request");
      }
      if (!DLNumber) {
        throwValidationError("DLNumber is required");
      }
      if (!DLValidity) {
        throwValidationError("DLValidity is required");
      }
    } else if (IsDriver === "false") {
      const requiredFields = [
        "Name",
        "Dob",
        "AadhaarNumber",
        "DLNumber",
        "DLValidity",
        "PhoneNo",
        "EmailId",
      ];

      for (const field of requiredFields) {
        if (!fields[field]) {
          throwValidationError(`${field} is required`);
        }
      }

      if (!validator.isLength(Name, { min: 3, max: 50 })) {
        throwValidationError("Name must be between 1 and 50 characters");
      }
      if (!validator.isLength(AadhaarNumber, { min: 12, max: 12 })) {
        throwValidationError("AadhaarNumber must be a 12-digit number");
      }
      if (!validator.isMobilePhone(PhoneNo, "en-IN")) {
        throwValidationError("PhoneNo must be a 10-digit number");
      }
      if (!validator.isEmail(EmailId)) {
        throwValidationError("Invalid email format for EmailId");
      }
      const dobPattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
      if (!dobPattern.test(Dob)) {
        throw new Error("Dob must be in format DD/MM/YYYY.");
      }

      const [day, month, year] = Dob.split("/").map(Number);
      const dob = new Date(year, month - 1, day);

      const age = new Date().getFullYear() - dob.getFullYear();
      const monthDifference = new Date().getMonth() - dob.getMonth();
      const dayDifference = new Date().getDate() - dob.getDate();

      if (
        age < 18 ||
        (age === 18 &&
          (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)))
      ) {
        throw new Error("User must be at least 18 years old.");
      }
      ["AadhaarFront", "AadhaarRear", "Profile"].forEach((itm) => {
        if (!files[itm]) {
          throw new Error(`Please select a ${itm} image`);
        }
      });
      if (files.length > 5) {
        throwValidationError("Invalid request");
      }
    } else {
      throwValidationError("Invalid value for IsDriver");
    }
    if (!DLNumber) {
      throwValidationError("Please enter a DL Number");
    }
    const dlNumberRegex = /^[A-Z]{2}[0-9]{2} ?[0-9]{11}$/;
    if (!dlNumberRegex.test(DLNumber)) {
      throwValidationError("Please enter a valid DL Number");
    }
    isValidFutureDate(DLValidity);
    ["DLFront", "DLRear"].forEach((itm) => {
      if (!files[itm]) {
        throw new Error(`Please select a ${itm} image`);
      }
    });
    let filter;
    let profile;
    if (IsDriver === "true") {
      filter = { UserId: user.UserId, Status: { $ne: "unlinked" } };
      profile = await Operator.findOne({
        OperatorId: user.Operator.OperatorId,
      });
      if (!profile) {
        throwValidationError("No Profile found");
      }
    } else {
      profile = await User.findOne({
        EmailId: EmailId.toLowerCase(),
        PhoneNo: "+91" + PhoneNo,
      });
      if (!profile) {
        throwValidationError("No Profile found");
      }
      filter = { UserId: profile.UserId, Status: { $ne: "unlinked" } };
    }
    let exist = await Driver.findOne(filter);
    if (exist) {
      throwValidationError("Profile is already linked as driver");
    }
    let id = uniqid("Driver-");
    let folder = path.join(__dirname, "../files/driver/", id);
    if (IsDriver === "true") {
      try {
        copyRecursive(
          path.join(__dirname, "../files/operator/", user.Operator.OperatorId),
          folder
        );
      } catch (error) {
        cleanupFiles(folder);
        throw error;
      }
    }
    let filesave;
    try {
      filesave = await saveFilesToFolder(files, folder);
    } catch (error) {
      cleanupFiles(folder);
      throw error;
    }
    IsDriver = IsDriver === "true";
    const newDriver = new Driver({
      DriverId: id,
      UserId: filter.UserId,
      OperatorId: user.Operator.OperatorId,
      Name: IsDriver ? profile.Name : Name,
      Dob: IsDriver ? profile.Dob : Dob,
      PhoneNo: IsDriver ? user.PhoneNo : PhoneNo,
      Profile: IsDriver ? profile.Profile : filesave.Profile,
      AadhaarCard: {
        Number: IsDriver ? profile.AadhaarCard.Number : AadhaarNumber,
        FrontImage: IsDriver
          ? profile.AadhaarCard.FrontImage
          : filesave.AadhaarFront,
        BackImage: IsDriver
          ? profile.AadhaarCard.BackImage
          : filesave.AadhaarRear,
      },
      DrivingLicence: {
        Number: DLNumber,
        Expiry: DLValidity,
        FrontImage: filesave.DLFront,
        BackImage: filesave.DLRear,
      },
    });
    try {
      let result = await newDriver.save();
      res.status(201).json({
        success: true,
        message: "Driver Registration in progress",
      });
    } catch (error) {
      cleanupFiles(folder);
      throw error;
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// === === === Activation status === === === //

exports.getActivation = async (req, res) => {
  try {
    const user = req.user;
    if (!user.Operator || !user.Operator.verified) {
      return res
        .status(401)
        .json({ success: false, message: "unauthorized access" });
    }
    const driver = await Driver.findOne({
      OperatorId: user.Operator.OperatorId,
      Status: { $ne: "unlinked" },
    });
    const cab = await Cab.findOne({
      OperatorId: user.Operator.OperatorId,
      Status: { $ne: "unlinked" },
    });
    res.status(200).json({
      success: true,
      data: { driver: driver ? driver.Status : "", cab: cab ? cab.Status : "" },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// === === === Register a Cab === === === //

const Cab = require("../Database/collection/Cab");
const { model } = require("mongoose");

exports.RegisterCab = async (req, res) => {
  try {
    const user = req.user;
    if (!user.Operator || !user.Operator.verified) {
      return res
        .status(401)
        .json({ success: false, message: "unauthorized access" });
    }
    const { fields, files } = await busboyPromise(req);
    let { Model, CabNumber } = fields;
    ["Photo", "Permit", "Authorization", "RegistrationCertificate"].forEach(
      (itm) => {
        if (!files[itm]) {
          throw new Error(
            `Please select a ${itm === "Photo" ? "Cab" : itm} image`
          );
        }
      }
    );
    if (Model == undefined || CabNumber == undefined) {
      throw new Error(`All fields are required`);
    }
    if (!validator.isLength(CabNumber, { max: 14, min: 9 })) {
      throw new Error("please enter a valid Cab Number");
    }
    Model = JSON.parse(Model);
    ["name", "manufacturer", "segment"].forEach((itm) => {
      if (!Model[itm]) {
        throw new Error(`${itm} of cab is required`);
      }
    });
    const exist = await Cab.findOne({ CabNumber, status: { $ne: "unlinked" } });
    if (exist) {
      throw new Error("Cab Aleready linked with other operator");
    }
    let id = uniqid("Cab-");
    let folderpath = await path.join(__dirname, "../files/cab/", id);
    let filesave;
    try {
      filesave = await saveFilesToFolder(files, folderpath);
    } catch (error) {
      cleanupFiles(folderpath);
      throw error;
    }
    const newcab = new Cab({
      CabNumber,
      CabId: id,
      Manufacturer: Model.manufacturer,
      Model: Model.name,
      Category: Model.segment,
      Photo: filesave.Photo,
      Document: {
        Authorization: filesave.Authorization,
        Permit: filesave.Permit,
        RegistrationCertificate: filesave.RegistrationCertificate,
      },
      OperatorId: user.Operator.OperatorId,
    });
    try {
      let result = await newcab.save();
      res.status(201).json({
        success: true,
        message: "Cab Registration in progress",
      });
    } catch (error) {
      cleanupFiles(folderpath);
      throw error;
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

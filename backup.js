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
      res
        .status(500)
        .send({ error: "An error occurred while searching for cities" });
    }
  };

  // === === === search === === === //

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

  // === === === get distance === === === //

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
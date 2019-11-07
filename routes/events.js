const express = require("express");
const mongoose = require("mongoose");
const { Event, healthTypesArray } = require("../models/Event");
const { drinkTypesArray } = require("../models/Drink");
const { checkIfLoggedIn } = require("../middlewares/index");
const getDrink = require("../helpers/getDrink");

const router = express.Router();

/* Events route:
/events - shows events for current user
*/

router.get("/events", checkIfLoggedIn, async (req, res, next) => {
  const userId = req.session.currentUser._id;
  if (!userId) return res.status(401).json({ code: "unauthorized" });

  try {
    const events = await Event.find({ user: userId })
      .populate("drink")
      .sort({ date: -1 });
    return res.json(events);
  } catch (error) {
    next(error);
  }
});

/* Get one event by eventId */
router.get("/event/:eventId", checkIfLoggedIn, async (req, res, next) => {
  const userId = req.session.currentUser._id;
  if (!userId) return res.status(401).json({ code: "unauthorized" });

  const { eventId } = req.params;

  /* user can get only his own events */
  try {
    const foundEvent = await Event.findOne({
      _id: mongoose.Types.ObjectId(eventId),
      user: userId
    }).populate("drink");
    if (!foundEvent)
      return res.status(400).json({ code: "invalid income data" });
    return res.json(foundEvent);
  } catch (error) {
    next(error);
  }
});

/* Add/post event */
router.post("/events", checkIfLoggedIn, async (req, res, next) => {
  const {
    drinkType,
    drinkName,
    percentage,
    date,
    cost,
    volume,
    health
  } = req.body;
  const userId = req.session.currentUser._id;
  if (!userId) return res.status(401).json({ code: "unauthorized" });

  /* we check that all three properties come from front-end
	if not, send an error */
  let prepDrinkId;
  if (drinkType && drinkName && percentage) {
    /* helper method that gets drink ObjectId from Drink collection */
    prepDrinkId = await getDrink(res, drinkType, drinkName, percentage);
  } else {
    return res.status(400).json({ code: "invalid income data" });
  }

  /* building mongoose query object */
  const query = {
    user: userId,
    drink: prepDrinkId,
    date: date
  };

  if (cost) query.cost = parseInt(cost);

  /* because volume field on Event Schema is mandatory we need to
	check if volume value was specified from front-end. */
  if (volume) {
    query.volume = parseInt(volume);
  } else {
    return res.status(400).json({ code: "invalid income data" });
  }

  /* health field on Event Schema is optional,
	hawever we don't want random strings to be specified at
	this field. so we perform checks. */
  if (health) {
    if (healthTypesArray.indexOf(health) > -1) {
      query.health = health;
    } else {
      return res.status(400).json({ code: "invalid income data" });
    }
  }

  try {
    const newEvent = await Event.create(query);
    return res.json(newEvent);
  } catch (error) {
    next(error);
  }
});

/* delete post event */
router.delete("/events/:eventId", checkIfLoggedIn, async (req, res, next) => {
  const userId = req.session.currentUser._id;
  if (!userId) return res.status(401).json({ code: "unauthorized" });

  const { eventId } = req.params;

  /* user can delete only his own events */
  try {
    const deletedEvent = await Event.findOneAndDelete({
      _id: mongoose.Types.ObjectId(eventId),
      user: userId
    });
    if (!deletedEvent)
      return res.status(400).json({ code: "invalid income data" });
    return res.json(deletedEvent);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

// /* endpoint is needed for rendering available labels on front-end */
// router.get("/drink", async (req, res) => {
//   return res.json(drinkTypesArray);
// });

// /* endpoint is needed for rendering available labels on front-end */
// router.get("/health", async (req, res) => {
//   return res.json(healthTypesArray);
// });

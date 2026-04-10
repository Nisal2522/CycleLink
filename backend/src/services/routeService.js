/**
 * src/services/routeService.js
 * --------------------------------------------------
 * Route business logic. All Route model access here (Controller → Service → Model).
 */

import mongoose from "mongoose";
import Route from "../models/Route.js";
import { ROUTE_STATUS } from "../constants.js";
import { LIMITS } from "../constants.js";

export async function createRoute(creatorId, body) {
  const {
    startLocation,
    endLocation,
    path,
    distance,
    duration,
    weatherCondition,
  } = body;
  const route = await Route.create({
    creatorId: creatorId
      ? new mongoose.Types.ObjectId(creatorId.toString())
      : null,
    startLocation: String(startLocation).trim(),
    endLocation: String(endLocation).trim(),
    path: path.map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) })),
    distance: String(distance).trim(),
    duration: duration != null ? String(duration).trim() : "",
    weatherCondition:
      weatherCondition != null ? String(weatherCondition).trim() : "",
  });
  return Route.findById(route._id).populate("creatorId", "name").lean();
}

export async function getPublicRoutes() {
  return Route.find({
    $or: [{ status: ROUTE_STATUS.APPROVED }, { status: { $exists: false } }],
  })
    .populate("creatorId", "name")
    .select(
      "startLocation endLocation path distance duration weatherCondition averageRating ratingCount createdAt",
    )
    .sort({ createdAt: -1 })
    .lean()
    .limit(LIMITS.ROUTES_PUBLIC);
}

export async function getMyRoutes(creatorId) {
  return Route.find({ creatorId })
    .populate("creatorId", "name")
    .sort({ createdAt: -1 })
    .lean();
}

export async function updateRoute(routeId, userId, body) {
  const route = await Route.findById(routeId);
  if (!route) {
    const err = new Error("Route not found");
    err.statusCode = 404;
    throw err;
  }
  if (route.creatorId.toString() !== userId.toString()) {
    const err = new Error("You can only update routes you created");
    err.statusCode = 403;
    throw err;
  }
  const {
    startLocation,
    endLocation,
    path,
    distance,
    duration,
    weatherCondition,
  } = body;
  const updateBody = {
    startLocation: String(startLocation).trim(),
    endLocation: String(endLocation).trim(),
    path: path.map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) })),
    distance: String(distance).trim(),
    duration: duration != null ? String(duration).trim() : "",
    weatherCondition:
      weatherCondition != null ? String(weatherCondition).trim() : "",
  };
  const updated = await Route.findByIdAndUpdate(routeId, updateBody, {
    new: true,
    runValidators: true,
  })
    .populate("creatorId", "name")
    .lean();
  return updated;
}

export async function deleteRoute(routeId, userId) {
  const route = await Route.findById(routeId);
  if (!route) {
    const err = new Error("Route not found");
    err.statusCode = 404;
    throw err;
  }
  if (route.creatorId.toString() !== userId.toString()) {
    const err = new Error("You can only delete routes you created");
    err.statusCode = 403;
    throw err;
  }
  await Route.findByIdAndDelete(routeId);
  return { message: "Route deleted successfully" };
}

/**
 * Create a new rating for a route.
 */
export async function rateRoute(userId, routeId, body) {
  const { rating, comment } = body;

  const route = await Route.findById(routeId);
  if (!route) {
    const err = new Error("Route not found");
    err.statusCode = 404;
    throw err;
  }

  // Check if user already rated this route
  const alreadyRated = route.ratings.some(
    (r) => r.userId.toString() === userId.toString(),
  );

  if (alreadyRated) {
    const err = new Error(
      "You have already rated this route. Use PUT to update.",
    );
    err.statusCode = 409;
    throw err;
  }

  route.ratings.push({
    userId,
    rating,
    comment: comment || "",
    createdAt: new Date(),
  });

  // Recalculate average rating
  const totalRating = route.ratings.reduce((sum, r) => sum + r.rating, 0);
  route.averageRating = parseFloat(
    (totalRating / route.ratings.length).toFixed(2),
  );
  route.ratingCount = route.ratings.length;

  await route.save();
  await route.populate("ratings.userId", "name");

  return route;
}

/**
 * Update an existing rating for a route.
 */
export async function updateRating(userId, routeId, body) {
  const { rating, comment } = body;

  const route = await Route.findById(routeId);
  if (!route) {
    const err = new Error("Route not found");
    err.statusCode = 404;
    throw err;
  }

  const existingRatingIndex = route.ratings.findIndex(
    (r) => r.userId.toString() === userId.toString(),
  );

  if (existingRatingIndex === -1) {
    const err = new Error("You have not rated this route yet");
    err.statusCode = 404;
    throw err;
  }

  route.ratings[existingRatingIndex].rating = rating;
  route.ratings[existingRatingIndex].comment = comment || "";
  route.ratings[existingRatingIndex].createdAt = new Date();

  // Recalculate average rating
  const totalRating = route.ratings.reduce((sum, r) => sum + r.rating, 0);
  route.averageRating = parseFloat(
    (totalRating / route.ratings.length).toFixed(2),
  );
  route.ratingCount = route.ratings.length;

  await route.save();
  await route.populate("ratings.userId", "name");

  return route;
}

/**
 * Get ratings for a route.
 */
export async function getRouteRatings(routeId) {
  const route = await Route.findById(routeId)
    .populate("ratings.userId", "name")
    .select("ratings averageRating ratingCount");

  if (!route) {
    const err = new Error("Route not found");
    err.statusCode = 404;
    throw err;
  }

  return {
    averageRating: route.averageRating,
    ratingCount: route.ratingCount,
    ratings: route.ratings.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    ),
  };
}

/**
 * Delete a rating (user can remove their own rating).
 */
export async function deleteRating(userId, routeId) {
  const route = await Route.findById(routeId);
  if (!route) {
    const err = new Error("Route not found");
    err.statusCode = 404;
    throw err;
  }

  const ratingIndex = route.ratings.findIndex(
    (r) => r.userId.toString() === userId.toString(),
  );

  if (ratingIndex === -1) {
    const err = new Error("Rating not found");
    err.statusCode = 404;
    throw err;
  }

  route.ratings.splice(ratingIndex, 1);

  // Recalculate average
  if (route.ratings.length > 0) {
    const totalRating = route.ratings.reduce((sum, r) => sum + r.rating, 0);
    route.averageRating = parseFloat(
      (totalRating / route.ratings.length).toFixed(2),
    );
    route.ratingCount = route.ratings.length;
  } else {
    route.averageRating = 0;
    route.ratingCount = 0;
  }

  await route.save();

  return { message: "Rating deleted" };
}

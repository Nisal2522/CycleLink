import * as routeService from "../services/routeService.js";

export async function createRoute(req, res) {
  const creatorId = req.user?._id;
  if (!creatorId) {
    res.status(401);
    throw new Error("User not found");
  }
  const populated = await routeService.createRoute(creatorId, req.body);
  res.status(201).json(populated);
}

export async function getRoutes(req, res) {
  const routes = await routeService.getPublicRoutes();
  res.json(routes);
}

export async function getMyRoutes(req, res) {
  const routes = await routeService.getMyRoutes(req.user._id);
  res.json(routes);
}

export async function updateRoute(req, res) {
  const updated = await routeService.updateRoute(req.params.id, req.user._id, req.body);
  res.json(updated);
}

export async function deleteRoute(req, res) {
  const data = await routeService.deleteRoute(req.params.id, req.user._id);
  res.json(data);
}

/**
 * Rate a route (create new rating).
 */
export async function rateRoute(req, res) {
  const data = await routeService.rateRoute(req.user._id, req.params.id, req.body);
  res.status(201).json(data);
}

/**
 * Update an existing rating.
 */
export async function updateRating(req, res) {
  const data = await routeService.updateRating(req.user._id, req.params.id, req.body);
  res.json(data);
}

/**
 * Get route ratings.
 */
export async function getRouteRatings(req, res) {
  const data = await routeService.getRouteRatings(req.params.id);
  res.json(data);
}

/**
 * Delete a rating.
 */
export async function deleteRating(req, res) {
  const data = await routeService.deleteRating(req.user._id, req.params.id);
  res.json(data);
}
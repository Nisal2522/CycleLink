/**
 * controllers/hazardController.js
 * --------------------------------------------------
 * Hazard HTTP layer only. All data access via hazardService (Controller → Service → Model).
 */

import * as hazardService from "../services/hazardService.js";

export async function getHazards(req, res) {
  const hazards = await hazardService.getHazards();
  res.json(hazards);
}

export async function getHazardMarkers(req, res) {
  const markers = await hazardService.getHazardMarkers();
  console.log(`[hazards/markers] Returning ${markers.length} hazard marker(s)`);
  res.json(markers);
}

export async function reportHazard(req, res) {
  const hazard = await hazardService.reportHazard(req.user._id, req.body);
  res.status(201).json(hazard);
}

export async function updateHazard(req, res) {
  const hazard = await hazardService.updateHazard(req.params.id, req.user._id, req.body);
  res.json(hazard);
}

export async function deleteHazard(req, res) {
  const data = await hazardService.deleteHazard(req.params.id, req.user._id);
  res.json(data);
}

export async function verifyHazard(req, res) {
  const hazard = await hazardService.verifyHazard(
    req.params.id,
    req.user._id,
    req.body.status
  );
  res.json(hazard);
}

export async function getHazardVerifications(req, res) {
  const verifications = await hazardService.getHazardVerifications(req.params.id);
  res.json(verifications);
}

export async function moderateHazard(req, res) {
  const hazard = await hazardService.moderateHazard(
    req.params.id,
    req.user._id,
    req.body
  );
  res.json(hazard);
}

export async function forceDeleteHazard(req, res) {
  const data = await hazardService.forceDeleteHazard(req.params.id, req.user._id);
  res.json(data);
}

export async function cleanupStaleHazards(req, res) {
  const result = await hazardService.cleanupStaleHazards();
  res.json(result);
}

import { Router } from "express";
import { hives, measuresByHive } from "../data/hives.js";

// Ce routeur est monté sur /api/hives dans app.js : ici les chemins sont relatifs ("/" et "/:id"),
// jamais "/api/hives/…" (sinon double préfixe et 404).
const router = Router();

// GET /api/hives et GET /api/hives?site_id=SN-CASA
router.get("/", (req, res) => {
  const { site_id } = req.query;

  // Une chaîne vide ("?site_id=") n'est pas undefined : on la traite comme "pas de filtre".
  if (!site_id) {
    return res.json(hives);
  }

  // filter (toutes les ruches du site), pas find (la première seulement).
  res.json(hives.filter((hive) => hive.site_id === site_id));
});

// GET /api/hives/:id
router.get("/:id", (req, res) => {
  const hive = hives.find((h) => h.id === req.params.id);
  if (!hive) {
    return res.status(404).json({ error: `Ruche inconnue : ${req.params.id}` });
  }
  res.json(hive);
});

// POST /api/hives/:id/measures
router.post("/:id/measures", (req, res) => {
  const { id } = req.params;

  const hive = hives.find((h) => h.id === id);
  if (!hive) {
    return res.status(404).json({ error: `Ruche inconnue : ${id}` });
  }

  // Sans corps JSON valide, req.body vaut undefined : on se ramène à un objet vide.
  const mesure = req.body ?? {};

  // Seuls timestamp et weight_kg sont obligatoires. On teste undefined/null et non "falsy",
  // car un poids de 0 serait une valeur présente.
  const manquants = ["timestamp", "weight_kg"].filter(
    (champ) => mesure[champ] === undefined || mesure[champ] === null || mesure[champ] === ""
  );
  if (manquants.length > 0) {
    return res
      .status(400)
      .json({ error: `Champ(s) obligatoire(s) manquant(s) : ${manquants.join(", ")}` });
  }

  if (typeof mesure.weight_kg !== "number" || Number.isNaN(mesure.weight_kg)) {
    return res.status(400).json({ error: "weight_kg doit être un nombre" });
  }

  if (Number.isNaN(Date.parse(mesure.timestamp))) {
    return res.status(400).json({ error: "timestamp doit être une date ISO 8601 valide" });
  }

  // Si la trame contient un hive_id, il doit être celui du chemin.
  if (mesure.hive_id !== undefined && mesure.hive_id !== id) {
    return res
      .status(400)
      .json({ error: `hive_id (${mesure.hive_id}) ne correspond pas à la ruche du chemin (${id})` });
  }

  // Le timestamp de la trame est conservé tel quel : c'est l'instant de la prise par le capteur,
  // pas celui de la réception par le serveur.
  const enregistree = { ...mesure, hive_id: id, site_id: hive.site_id };

  (measuresByHive[id] ??= []).push(enregistree);

  res.status(201).json(enregistree);
});

export default router;
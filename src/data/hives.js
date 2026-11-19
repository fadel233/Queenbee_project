// Données en mémoire : quelques ruches de deux sites (SN-CASA et SN-KOLD).
// Pas de base de données pour l'instant : tout est perdu à l'arrêt du serveur.

export const hives = [
  { id: "SN-CASA-001", site_id: "SN-CASA", status: "active" },
  { id: "SN-CASA-002", site_id: "SN-CASA", status: "active" },
  { id: "SN-CASA-003", site_id: "SN-CASA", status: "inactive" },
  { id: "SN-KOLD-001", site_id: "SN-KOLD", status: "active" },
  { id: "SN-KOLD-002", site_id: "SN-KOLD", status: "active" },
];

// Mesures reçues, rangées par id de ruche : { "SN-CASA-001": [mesure, mesure, …] }
export const measuresByHive = {};
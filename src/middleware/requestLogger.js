// Intergiciel de journalisation : une ligne par requête, écrite à la fin de la réponse.
// Format : date  MÉTHODE  URL complète  statut  durée en ms

export function requestLogger(req, res, next) {
  const debut = performance.now();

  // "finish" est émis quand la réponse est entièrement envoyée :
  // le code de statut est alors connu, et la durée est complète.
  res.on("finish", () => {
    const duree = (performance.now() - debut).toFixed(1);
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${duree} ms`
    );
  });

  next();
}
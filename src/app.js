import express from "express";
import { requestLogger } from "./middleware/requestLogger.js";
import hivesRouter from "./routes/hives.js";

const app = express();

// Le journal d'abord, pour que toute requête soit tracée, même une 404.
// Pour comparer avec morgan : npm install morgan, puis remplacer cette ligne par
//   import morgan from "morgan";   …   app.use(morgan("dev"));
// Ne gardez qu'un seul des deux, sinon chaque requête apparaît deux fois.
app.use(requestLogger);

// express.json() avant les routes, sinon req.body vaut undefined.
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/hives", hivesRouter);

// Route inconnue : 404 en JSON.
app.use((req, res) => {
  res.status(404).json({ error: `Route inconnue : ${req.method} ${req.originalUrl}` });
});

// Erreurs (par exemple un JSON mal formé dans le corps) : réponse JSON au lieu d'une page HTML.
app.use((err, req, res, next) => {
  const status = err.status ?? err.statusCode ?? 500;
  res.status(status).json({ error: status === 400 ? "Corps JSON invalide" : "Erreur serveur" });
});

export default app;
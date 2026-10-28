import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const port = Number(process.env.FRONTEND_PORT) || 5173;

app.use(express.static(publicDir));
app.get("/{*path}", (req, res, next) => {
  if (!req.accepts("html")) return next();
  res.sendFile(path.join(publicDir, "index.html"));
});
app.listen(port, () => {
  console.log(`Bakery ERP frontend listening on http://localhost:${port}`);
});

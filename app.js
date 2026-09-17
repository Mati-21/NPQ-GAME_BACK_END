import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cors from "cors";
import createHttpError from "http-errors";

import path from "path";

// import routes
import routes from "./route/index.route.js";

dotenv.config();

// initializing an app
const app = express();

// Enable trust proxy for secure cookies behind Render reverse proxy
app.set("trust proxy", 1);

// morgan
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// json body parser
app.use(express.json());

// html form parser
app.use(express.urlencoded({ extended: true }));

// cookie- parser
app.use(cookieParser());

// cors allowed origins
const allowedOrigins = [
  "http://localhost:5173",
  "https://npq-game-front-end.vercel.app",
  "https://npq-game-front-end-git-main-mati-21s-projects.vercel.app",
];

if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

// cors
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, uptime pingers)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Serve local uploads folder
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Root health check
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "NPQ Server is running" });
});

// routes
app.use("/api/v1", routes);


// handle un reached route or page that did not exist
app.use((req, res, next) => {
  next(createHttpError.NotFound("This route does not exist"));
});

// General error handler
app.use((err, req, res, next) => {
  console.error("ERROR:", err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal Error Server",
      status: err.status || 500,
    },
  });
});

// exporting the app
export default app;

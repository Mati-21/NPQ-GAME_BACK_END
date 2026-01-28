import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cors from "cors";
import createHttpError from "http-errors";

// import routes
import routes from "./route/index.route.js";
import fileUpload from "express-fileupload";

dotenv.config();

// initializing an app
const app = express();

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

//file upload
app.use(fileUpload({ useTempFiles: true }));

// cors
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// routes
app.use("/api/v1", routes);

// handle un reached route or page that did not exist
app.use((req, res, next) => {
  next(createHttpError.NotFound("This route does not exist"));
});

// General error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal Error Server",
      status: err.status || 500,
    },
  });
});

// exporting the app
export default app;

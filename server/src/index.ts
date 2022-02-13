import express, {NextFunction} from "express";
import "./types/express.ext";
import config from "./config";
import * as migrations from "./database/migrate";
import auth from "./auth/middleware";
import {HttpException} from "./types/HttpException";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";

import authRoute from "./routes/auth";

const app = express();

(async () => {

  await migrations.init();

  app.use(bodyParser.json());

  app.use(cookieParser());

  app.use("/", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://ctflib.junron.dev");
    next();
  });

  app.use("/me", auth);

  app.use("/", authRoute);


  app.get("/", (req: express.Request, res: express.Response, next: NextFunction) => {
    res.send("Hello World!");
  });


  app.use(
    (
      error: HttpException,
      req: express.Request,
      res: express.Response,
      next: NextFunction,
    ) => {
      if (error.status) {
        res.status(error.status);
      } else {
        res.status(500);
      }
      res.json({
        success: false,
        message: error.message,
      });
      next();
    },
  );


  app.listen(config.port, () => {
    console.log(`server is running at http://localhost:${config.port}`);
  });

})();
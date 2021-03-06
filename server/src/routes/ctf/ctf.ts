import {NextFunction, Request, Response} from "express";
import {CTF} from "../../models/ctf/ctf";
import challengeRouter from "./challenge";
import {plainToInstance} from "class-transformer";
import {validate} from "class-validator";

const router = require('express').Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const includeCTFTime = !!req.query.includeCTFTime;
  return res.success("", await CTF.getCTFs(includeCTFTime));
});

router.get("/names", async (req: Request, res: Response, next: NextFunction) => {
  return res.success("", await CTF.getNames());
});

router.get("/get/:id", async (req: Request, res: Response, next: NextFunction) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.failure("Invalid ID", "id");
    return;
  }
  const ctf = await CTF.getCTFById(id);
  if (ctf) {
    res.success("Success", ctf);
  } else {
    res.failure("CTF not found", "id");
  }
});

router.post("/create", async (req: Request, res: Response, next: NextFunction) => {
  const ctf = plainToInstance(CTF, req.body as CTF, {exposeDefaultValues: true});
  ctf.start_date = new Date(ctf.start_date);
  ctf.end_date = new Date(ctf.end_date);
  const errors = await validate(ctf);
  if (errors.length == 0) {
    if (await res.handleLengthViolation(res.handleRefViolation(ctf.create(), "ctf_name"))) {
      return;
    }
    return res.success("CTF created", ctf);
  } else {
    return res.validationFailure(errors);
  }
});

router.post("/edit/:id", async (req: Request, res: Response, next: NextFunction) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.failure("Invalid ID", "id");
    return;
  }
  const ctf = await CTF.getCTFById(id);
  if (ctf) {
    const newCTF = plainToInstance(CTF, req.body as CTF, {exposeDefaultValues: true});
    newCTF.start_date = new Date(newCTF.start_date);
    newCTF.end_date = new Date(newCTF.end_date);
    const errors = await validate(newCTF);
    if(errors.length > 0){
      return res.validationFailure(errors);
    }
    newCTF.event_id = ctf.event_id;
    if (await res.handleRefViolation(ctf.editCTF(newCTF), "ctf_name")) {
      return;
    }
    res.success("CTF edited", newCTF);
  } else {
    res.failure("CTF not found", "id");
  }
});

router.use("/get/:ctfID/challenges", challengeRouter);

export default router;

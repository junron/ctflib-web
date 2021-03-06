import {NextFunction, Request, Response} from "express";
import {plainToInstance} from "class-transformer";
import {validate} from "class-validator";
import {Resource} from "../models/resource";

const router = require('express').Router();

router.get("/get/:id", async (req: Request, res: Response, next: NextFunction) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.failure("Invalid ID", "id");
    return;
  }
  const resource = await Resource.getResourceById(id, req.auth);
  if (resource) {
    res.success("Success", resource);
  } else {
    res.failure("Resource not found", "id");
  }
});

router.get("/search", async (req: Request, res: Response, next: NextFunction) => {
  const q = req.query.q;
  if (typeof q != "string") {
    res.failure("Invalid query", "q");
    return;
  }
  const resources = await Resource.search(q, req.auth);
  res.success("Success", resources);
});

router.post("/create", async (req: Request, res: Response, next: NextFunction) => {
  const resource = plainToInstance(Resource, req.body as Resource, {exposeDefaultValues: true});
  const user = req.user;
  if (!user) {
    return res.failure("User not found");
  }
  resource.poster_username = user.username;
  const errors = await validate(resource);
  if (errors.length == 0) {
    if (await res.handleLengthViolation(res.handleRefViolation(resource.createWithTransaction(), "category"))) {
      return;
    }
    return res.success("Resource created", resource);
  } else {
    return res.validationFailure(errors);
  }
});


router.delete("/delete/:id", async (req: Request, res: Response, next: NextFunction) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.failure("Invalid ID", "id");
    return;
  }
  const resource = await Resource.getResourceById(id, req.auth);
  if (resource) {
    await resource.deleteResource();
    res.success("Resource deleted", resource);
  } else {
    res.failure("Resource not found", "id");
  }
});

router.post("/edit/:id", async (req: Request, res: Response, next: NextFunction) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.failure("Invalid ID", "id");
    return;
  }
  const resource = await Resource.getResourceById(id, req.auth);
  if (resource) {
    const newResource = plainToInstance(Resource, req.body as Resource, {exposeDefaultValues: true});
    newResource.post_id = resource.post_id;
    const errors = await validate(newResource);
    if (errors.length > 0) {
      return res.validationFailure(errors);
    }
    if (await res.handleLengthViolation(res.handleRefViolation(resource.editResource(newResource), "category"))) {
      return;
    }
    res.success("Resource edited", newResource);
  } else {
    res.failure("Resource not found", "id");
  }
});


export default router;

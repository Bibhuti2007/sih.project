import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jansetuRouter from "./jansetu";

const router: IRouter = Router();

router.use(healthRouter);
router.use(jansetuRouter);

export default router;

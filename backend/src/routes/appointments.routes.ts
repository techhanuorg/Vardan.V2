import { Router } from "express";
import { AppointmentsController } from "../controllers/appointments.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

// Apply auth protection middleware globally
router.use(authenticate);

router.post("/book", AppointmentsController.book);
router.post("/reschedule", AppointmentsController.reschedule);
router.post("/cancel", AppointmentsController.cancel);
router.get("/", AppointmentsController.list);
router.get("/slots", AppointmentsController.getSlots);
router.get("/:id", AppointmentsController.getById);

export default router;

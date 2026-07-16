import { Router } from "express";
import { SuperController } from "../controllers/super.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

// Apply auth protection globally
router.use(authenticate);

router.get("/dashboard", SuperController.getDashboard);
router.get("/hospitals", SuperController.listHospitals);
router.post("/hospitals", SuperController.provisionHospital);
router.put("/hospitals/:id", SuperController.updateHospital);
router.delete("/hospitals/:id", SuperController.deleteHospital);

router.get("/subscriptions", SuperController.listSubscriptions);
router.post("/subscriptions", SuperController.createSubscription);

router.get("/licenses", SuperController.listLicenses);
router.post("/licenses", SuperController.generateLicense);

router.get("/revenue", SuperController.getRevenue);
router.get("/system", SuperController.getSystemMetrics);
router.get("/support", SuperController.listSupportTickets);

export default router;

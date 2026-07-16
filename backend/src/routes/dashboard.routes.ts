import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

// Apply auth protection middleware globally
router.use(authenticate);

router.get("/stats", DashboardController.getDashboardStats);

router.get("/patients", DashboardController.listPatients);
router.post("/patients", DashboardController.createPatient);
router.put("/patients/:id", DashboardController.updatePatient);
router.delete("/patients/:id", DashboardController.deletePatient);

router.get("/doctors", DashboardController.listDoctors);
router.post("/doctors", DashboardController.createDoctor);
router.put("/doctors/:id", DashboardController.updateDoctor);
router.delete("/doctors/:id", DashboardController.deleteDoctor);

router.get("/departments", DashboardController.listDepartments);
router.post("/departments", DashboardController.createDepartment);
router.put("/departments/:id", DashboardController.updateDepartment);
router.delete("/departments/:id", DashboardController.deleteDepartment);

router.get("/appointments", DashboardController.listAppointments);
router.post("/appointments", DashboardController.createAppointment);
router.put("/appointments/:id", DashboardController.updateAppointment);

router.get("/faqs", DashboardController.listFaqs);
router.post("/faqs", DashboardController.createFaq);
router.put("/faqs/:id", DashboardController.updateFaq);
router.delete("/faqs/:id", DashboardController.deleteFaq);

router.get("/campaigns", DashboardController.listCampaigns);
router.post("/campaigns", DashboardController.createCampaign);

router.get("/sheets", DashboardController.getSheetsConfig);
router.post("/sheets", DashboardController.saveSheetsConfig);

router.get("/settings", DashboardController.getSettings);
router.get("/logs", DashboardController.listLogs);

export default router;

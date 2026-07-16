import { Router } from "express";
import { WhatsAppController } from "../controllers/whatsapp.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

// Apply auth protection middleware globally
router.use(authenticate);

router.get("/status", WhatsAppController.getStatus);
router.get("/qr", WhatsAppController.getQr);
router.post("/connect", WhatsAppController.connect);
router.post("/disconnect", WhatsAppController.disconnect);
router.post("/reconnect", WhatsAppController.reconnect);
router.post("/send", WhatsAppController.send);
router.post("/send-media", WhatsAppController.sendMedia);
router.get("/chats", WhatsAppController.getChats);
router.get("/messages/:chatId", WhatsAppController.getMessages);

export default router;

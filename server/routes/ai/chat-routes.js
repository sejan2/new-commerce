const express = require("express");
const { chatWithAI } = require("../../controllers/ai/chat-controller");
const router = express.Router();
router.post("/chat", chatWithAI);
module.exports = router;
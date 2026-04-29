const express = require('express');
const { handleTTS } = require('../controllers/tts.controller');

const router = express.Router();

router.post('/', handleTTS);

module.exports = router;

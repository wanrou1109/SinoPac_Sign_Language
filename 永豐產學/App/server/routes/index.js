const express = require('express');
const router = express.Router();
const uploadRoutes = require('../uploadRoutes');

router.use('/upload', uploadRoutes);

module.exports = router;
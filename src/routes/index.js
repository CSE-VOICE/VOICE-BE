// API 경로 추가 예정
const express = require('express');
const router = express.Router();
const { db } = require('../models');

router.get('/', (req, res) => {
    res.json({ message: '서버가 정상적으로 실행중입니다.' });
});

module.exports = router;
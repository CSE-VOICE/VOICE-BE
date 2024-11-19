const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');

// 기본 서버 상태 체크 라우트는 유지
router.get('/', (req, res) => {
    res.json({ message: '서버가 정상적으로 실행중입니다.' });
});

// auth 라우트 연결
router.use('/auth', authRoutes);

module.exports = router;
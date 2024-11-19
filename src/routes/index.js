// API 경로 추가 예정
const express = require('express');
const router = express.Router();
const { db } = require('../models');

router.get('/', (req, res) => {
    res.json({ message: '서버가 정상적으로 실행중입니다.' });
});

// 테스트용 유저 생성
router.post('/test-create', async (req, res) => {
    try {
        const user = await db.User.create({
            email: 'test@example.com',
            pwd: 'test1234',
            phone: '01012345678',
            name: '테스트유저1',
            login_type: 'local'
        });

        res.json({
            message: '테스트 유저가 생성되었습니다.',
            user
        });
    } catch (error) {
        res.status(500).json({
            message: '테스트 유저 생성에 실패했습니다.',
            error: error.message
        });
    }
});

// 테스트용 유저 조회
router.get('/test-get', async (req, res) => {
    try {
        const users = await db.User.findAll();
        res.json({
            message: '유저 목록을 조회했습니다.',
            users
        });
    } catch (error) {
        res.status(500).json({
            message: '유저 목록 조회에 실패했습니다.',
            error: error.message
        });
    }
})

module.exports = router;
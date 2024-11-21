const express = require('express');
const router = express.Router();
const { aiPickController } = require('../controllers');

router.post('/recommend', aiPickController.sendRecommendRequest); // AI 모델에 루틴 추천 요청 전송 (/ai-pick/recommend)
router.get('/recommend', aiPickController.getCurrentRecommendation); // 세션에 저장된 현재 추천 루틴 조회 (/ai-pick/recommend)
router.post('/recommend/accept', aiPickController.acceptRecommendation); // AI 루틴 추천 수락/적용 (/ai-pick/recommend/accept)
router.post('/recommend/reject', aiPickController.rejectRecommendation); // AI 루틴 추천 거절 (/ai-pick/recommend/reject)
router.post('/recommend/refresh', aiPickController.refreshRecommendation); // AI 루틴 재추천 요청 (/ai-pick/recommend/refresh)

module.exports = router;
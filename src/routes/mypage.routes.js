const express = require('express');
const router = express.Router();
const { mypageController } = require('../controllers');

router.get('/histories', mypageController.getRoutineHistories); // 루틴 목록 조회 (검색어가 있다면 검색 결과 반환)
router.get('/histories/:historyId', mypageController.getRoutineById); // 루틴별 상세 조회
router.post('/histories/:historyId/execute', mypageController.executeRoutine); // 특정 루틴 실행
router.delete('/histories/:historyId', mypageController.deleteRoutine); // 특정 루틴 삭제

// 프로필 관련 기능은 프론트에서 처리

module.exports = router;
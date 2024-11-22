const express = require('express');
const router = express.Router();
const { applianceController } = require('../controllers');

router.get('/', applianceController.getAllAppliances); // 기기 목록 조회 (/appliances?userId=1)
router.get('/:applianceId', applianceController.getApplianceById); // 기기별 상세 조회 (/appliances/1?userId=1)
router.patch('/:applianceId', applianceController.controlAppliancePower); // 기기별 전원 제어 (/appliances/1?userId=1)
router.patch('/', applianceController.updateAppliances); // 기기 변동사항 업데이트

module.exports = router;
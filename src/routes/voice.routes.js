// 음성 파일 처리 관련 라우트
const express = require('express');
const router = express.Router();
const { voiceController } = require('../controllers');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// multer 저장소 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // uploads/년/월 형식으로 저장 폴더 생성
        const dateFolder = path.join('src/uploads',
            new Date().getFullYear().toString(),
            (new Date().getMonth() + 1).toString().padStart(2, '0')
        );
        fs.mkdirSync(dateFolder, { recursive: true });
        cb(null, dateFolder);
    },
    filename: (req, file, cb) => {
        // 파일명: YYYYMMDD_HHMMSS_원본파일명 형식으로 저장
        const date = new Date();
        const formattedDate = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`;
        cb(null, `${formattedDate}_${file.originalname}`);
    }
});

const upload = multer({ storage });

// 음성 파일 업로드 라우트
router.post('/process', upload.single('audio'), voiceController.processVoice);

module.exports = router;
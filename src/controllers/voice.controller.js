// 음성 파일 처리 컨트롤러₩
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

class VoiceController {
    processVoice = async (req, res) => {
        try {
            // multer를 통해 전송된 파일이 존재하는지 확인
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: '음성 파일이 없습니다.'
                });
            }

            // m4a 파일을 wav로 변환하는 함수 호출
            const wavPath = await this.convertToWav(req.file.path);

            // 변환된 wav 파일 경로를 JSON 형태로 응답
            res.json({
                success: true,
                data: { wavFile: wavPath}
            });
        } catch (error) {
            // 파일 처리 중 발생한 에러 처리
            console.error('Voice processing error:', error);
            res.status(500).json({
                success: false,
                message: '음성 파일 처리에 실패했습니다.'
            });
        }
    }

    // convertToWav - m4a 파일을 wav 파일로 변환하는 함수
    convertToWav = async (inputPath) => {
        // 출력 파일 경로 설정 (.m4a 확장자를 .wav로 변경)
        const outputPath = inputPath.replace('.m4a', '.wav');

        // Promise를 반환하여 비동기 처리
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .toFormat('wav')
                .on('end', () => {
                    // 기존 m4a 파일 삭제
                    fs.unlinkSync(inputPath); 
                    resolve(outputPath);
                })
                .on('error', reject)
                .save(outputPath);
        });
    }
}

module.exports = new VoiceController();
// 음성 파일 처리 컨트롤러₩
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');

const FASTAPI_URL = 'http://3.133.23.226:8000/voice_analysis/'; // FastAPI 서버 URL

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

            try {
                // m4a 파일을 wav로 변환
                const wavPath = await this.convertToWav(req.file.path);
                // 변환된 wav 파일을 FastAPI 서버로 전송
                await this.sendAudioForAnalysis(wavPath);

                // 전송된 파일의 상세 정보
                const fileInfo = {
                    name: path.basename(wavPath),
                    format: path.extname(wavPath),
                    wavPath: wavPath
                };

                // 성공 시 응답
                res.json({
                    success: true,
                    message: '음성 파일이 성공적으로 전송되었습니다.',
                    file: fileInfo
                });
            } catch (error) {
                // 에러 발생 시 임시 파일 정리
                if (req.file.path && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                throw error;
            }
        } catch (error) {
            console.error('Voice processing error:', error);
            res.status(500).json({
                success: false,
                message: '음성 파일 처리에 실패했습니다.',
                error: error.message
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
                .audioFrequency(16000)
                .audioChannels(1)
                .audioCodec('pcm_s16le')
                .on('end', () => {
                    // 기존 m4a 파일 삭제
                    fs.unlinkSync(inputPath); 
                    resolve(outputPath);
                })
                .on('error', reject)
                .save(outputPath);
        });
    }

    sendAudioForAnalysis = async (wavPath) => {
        const form = new FormData();
        form.append('audio', fs.createReadStream(wavPath), {
            filename: path.basename(wavPath),
            contentType: 'audio/wave'
        });
    
        try {
            const response = await axios.post(FASTAPI_URL, form, {
                headers: {
                    ...form.getHeaders(),
                    'Accept': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('FastAPI Error:', error.response?.data);
            throw new Error('음성 파일 전송에 실패했습니다.');
        }
    }
}

module.exports = new VoiceController();
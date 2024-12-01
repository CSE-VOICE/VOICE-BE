// 음성 파일 처리 컨트롤러₩
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');

const FASTAPI_URL = 'http://localhost:8000/analyze'; // FastAPI 서버 URL

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
                .on('end', () => {
                    // 기존 m4a 파일 삭제
                    fs.unlinkSync(inputPath); 
                    resolve(outputPath);
                })
                .on('error', reject)
                .save(outputPath);
        });
    }

    // sendAudioForAnalysis - wav 파일을 FastAPI 서버로 전송하는 함수
    sendAudioForAnalysis = async (wavPath) => {
        // form-data 객체 생성
        const form = new FormData();
        // wav 파일을 form-data에 추가
        form.append('file', fs.createReadStream(wavPath), {
            filename: path.basename(wavPath),
            contentType: 'audio/wav'
        });

        try {
            // FastAPI 서버로 POST 요청 전송
            await axios.post(FASTAPI_URL, form, {
                headers: {
                    ...form.getHeaders(), // form-data 헤더 포함
                }
            });
        } catch (error) {
            console.error('Error sending audio file to FASTAPI server:', error);
            throw new Error('음성 파일 전송에 실패했습니다.');
        }
    }

    // // FastAPI 서버 연동 전 테스트용 임시 함수
    // sendAudioForAnalysis = async (wavPath) => {
    //     console.log('음성 파일 변환 완료:', {
    //         path: wavPath
    //     });
    //     return true;
    // }
}

module.exports = new VoiceController();
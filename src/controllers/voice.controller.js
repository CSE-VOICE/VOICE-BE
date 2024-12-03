const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const { db } = require('../models');

const FASTAPI_URL = 'http://3.133.23.226:8000/voice_analysis/'; // FastAPI 서버 URL

ffmpeg.setFfmpegPath(ffmpegPath);

// 감정-이모티콘 매핑 테이블
const EMOTION_TO_EMOJI = {
    "감탄": "😍", "분노": "😡", "짜증": "😤",
    "불안": "😰", "경외감": "😲", "어색함": "😅",
    "지루함": "😴", "평온": "😌", "집중": "🧐",
    "혼란": "🤔", "숙고": "🧠", "경멸": "😒",
    "만족감": "😊", "갈망": "🤤", "욕망": "🔥",
    "결단력": "💪", "실망": "😞", "불찬성": "👎",
    "혐오감": "🤢", "고통": "😭", "의심": "🤨",
    "황홀감": "🤩", "당혹감": "😳", "공감의 고통": "😔",
    "열정": "🔥", "넋을 잃음": "😵", "질투": "😒",
    "흥분": "😆", "두려움": "😱", "감사": "🙏",
    "죄책감": "😢", "공포": "👻", "흥미": "🤓",
    "기쁨": "😁", "사랑": "❤️", "향수": "🎶",
    "자부심": "🏆", "깨달음": "💡", "안도감": "😌",
    "낭만": "🌹", "슬픔": "😢", "빈정거림": "🙃",
    "만족": "😊", "수치심": "😳", "부정적 놀람": "😨",
    "긍정적 놀람": "😯", "동정": "🤝", "피로": "😴",
    "승리감": "🎉"
};

// 음성파일 처리 컨트롤러 (시나리오용)
class VoiceController {
    // processVoice - 음성 파일 처리 메인
    processVoice = async (req, res) => {
        try {
            const { scenario } = req.params;
            const { userId } = req.query;

            // 시나리오 번호와 사용자 ID 확인
            if (!userId || !scenario || !['1', '2', '3'].includes(scenario)) {
                return res.status(400).json({
                    success: false,
                    message: '올바른 시나리옹 번호와 사용자 ID가 필요합니다.'
                });
            }

            // 시나리오 파일 경로 설정 및 존재 여부 확인
            const scenarioPath = path.join(__dirname, `../uploads/scenarios/scenario${scenario}.m4a`);
            if (!fs.existsSync(scenarioPath)) {
                return res.status(404).json({
                    success: false,
                    message: `시나리오 ${scenario} 파일을 찾을 수 없습니다.`
                });
            }

            // 음성 파일 처리 및 감정 분석 함수 호출
            const wavPath = await this.convertToWav(scenarioPath);
            const analysisResult = await this.sendAudioForAnalysis(wavPath);

            // 분석 결과를 DB에 업데이트 
            await this.updateApplianceStates(analysisResult.updates); // 기기 상태 업데이트
            await this.saveRoutineHistory({
                userId: parseInt(userId),
                situation: this.replaceEmotionWithEmoji(analysisResult.situation),
                routine: analysisResult.routine,
                updates: analysisResult.updates
            });

            // 분석 완료되면 변환된 wav 파일 삭제 (m4a은 유지)
            if (fs.existsSync(wavPath)) {
                fs.unlinkSync(wavPath);
            }

            // 모든 처리 완료 후 응답 반환
            res.json({
                success: true,
                message: '감정 분석 및 기기/루틴 DB 업데이트가 완료되었습니다.',
                data: analysisResult // FastAPI 분석 결과
            });
        } catch (error) {
            console.error('Voice processing error:', error);
            res.status(500).json({
                success: false,
                message: '음성 파일 처리에 실패했습니다.',
                error: error.message
            });
        }
    }

    // updateApplianceStates - 루틴에 맞게 기기 상태 업데이트
    updateApplianceStates = async (updates) => {
        try {
            for (const update of updates) {
                await db.Appliance.update(
                    {
                        onoff: update.onoff,
                        state: update.state,
                        is_active: update.is_active
                    },
                    {
                        where: {
                            id: update.appliance_id,
                            user_id: update.user_id
                        }
                    }
                );
            }
        } catch (error) {
            console.error('Appliance update error:', error);
            throw new Error('기기 상태 업데이트에 실패했습니다.');
        }
    }

    // saveRoutineHistory - 루틴을 RoutineHistory 테이블에 저장
    saveRoutineHistory = async ({ userId, situation, routine, updates }) => {
        try {
            await db.RoutineHistory.create({
                user_id: userId,
                situation_txt: situation,
                routine_txt: routine,
                app_updates: updates,
                result: 'success'
            });
        } catch (error) {
            console.error('Routine history save error:', error);
            throw new Error('루틴 히스토리 저장에 실패했습니다.');
        }
    }

    // replaceEmotionWithEmoji - 감정 분석 결과를 이모티콘으로 변환
    replaceEmotionWithEmoji = (emotionText) => {
        return emotionText.replace(/\((.*?)\)/g, (match, emotion) => {
            return EMOTION_TO_EMOJI[emotion] || match;
        });
    }

    // convertToWav - m4a 파일을 wav 파일로 변환
    convertToWav = async (inputPath) => {
        const outputPath = inputPath.replace('.m4a', '.wav');

        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .toFormat('wav')
                .audioFrequency(16000)
                .audioChannels(1)
                .audioCodec('pcm_s16le')
                .on('end', () => {
                    resolve(outputPath);
                })
                .on('error', reject)
                .save(outputPath);
        });
    }

    // sendAudioForAnalysis - FastAPI 서버로 음성 파일 전송 & 분석 요청
    sendAudioForAnalysis = async (wavPath) => {
        const form = new FormData();
        form.append('audio', fs.createReadStream(wavPath), {
            filename: path.basename(wavPath),
            contentType: 'audio/wave'
        });

        try {
            const response =  await axios.post(FASTAPI_URL, form, {
                headers: {
                    ...form.getHeaders(),
                    'Accept': 'application/json'
                }
            });
            return response.data; // FastAPI 분석 결과 반환
        } catch (error) {
            console.error('FastAPI Error:', error.response?.data);
            throw new Error('음성 파일 전송 및 분석에 실패했습니다.');
        }
    }
}

// // 음성파일 처리 컨트롤러
// class VoiceController {
//     processVoice = async (req, res) => {
//         try {
//             // multer를 통해 전송된 파일이 존재하는지 확인
//             if (!req.file) {
//                 return res.status(400).json({
//                     success: false,
//                     message: '음성 파일이 없습니다.'
//                 });
//             }

//             try {
//                 // m4a 파일을 wav로 변환
//                 const wavPath = await this.convertToWav(req.file.path);
//                 // 변환된 wav 파일을 FastAPI 서버로 전송
//                 await this.sendAudioForAnalysis(wavPath);

//                 // 전송된 파일의 상세 정보
//                 const fileInfo = {
//                     name: path.basename(wavPath),
//                     format: path.extname(wavPath),
//                     wavPath: wavPath
//                 };

//                 // 성공 시 응답
//                 res.json({
//                     success: true,
//                     message: '음성 파일이 성공적으로 전송되었습니다.',
//                     file: fileInfo
//                 });
//             } catch (error) {
//                 // 에러 발생 시 임시 파일 정리
//                 if (req.file.path && fs.existsSync(req.file.path)) {
//                     fs.unlinkSync(req.file.path);
//                 }
//                 throw error;
//             }
//         } catch (error) {
//             console.error('Voice processing error:', error);
//             res.status(500).json({
//                 success: false,
//                 message: '음성 파일 처리에 실패했습니다.',
//                 error: error.message
//             });
//         }
//     }

//     // convertToWav - m4a 파일을 wav 파일로 변환하는 함수
//     convertToWav = async (inputPath) => {
//         // 출력 파일 경로 설정 (.m4a 확장자를 .wav로 변경)
//         const outputPath = inputPath.replace('.m4a', '.wav');

//         // Promise를 반환하여 비동기 처리
//         return new Promise((resolve, reject) => {
//             ffmpeg(inputPath)
//                 .toFormat('wav')
//                 .audioFrequency(16000)
//                 .audioChannels(1)
//                 .audioCodec('pcm_s16le')
//                 .on('end', () => {
//                     // 기존 m4a 파일 삭제
//                     fs.unlinkSync(inputPath); 
//                     resolve(outputPath);
//                 })
//                 .on('error', reject)
//                 .save(outputPath);
//         });
//     }

//     sendAudioForAnalysis = async (wavPath) => {
//         const form = new FormData();
//         form.append('audio', fs.createReadStream(wavPath), {
//             filename: path.basename(wavPath),
//             contentType: 'audio/wave'
//         });
    
//         try {
//             const response = await axios.post(FASTAPI_URL, form, {
//                 headers: {
//                     ...form.getHeaders(),
//                     'Accept': 'application/json'
//                 }
//             });
//             return response.data;
//         } catch (error) {
//             console.error('FastAPI Error:', error.response?.data);
//             throw new Error('음성 파일 전송에 실패했습니다.');
//         }
//     }
// }

module.exports = new VoiceController();
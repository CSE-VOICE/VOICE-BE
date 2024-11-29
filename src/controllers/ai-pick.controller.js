const { db } = require('../models');
const axios = require('axios');

const ML_API_URL = 'http://3.133.23.226:8000/recommend_routine/';

// AI 모델에 루틴 추천 요청 전송
exports.sendRecommendRequest = async (req, res) => {
    try {
        const { userId } = req.query; // 바디로 userId를 프론트에서 받아옴
        const { situation } = req.body; // 바디로 situation을 프론트에서 받아옴
        
        // 필수 값 체크
        if (!userId || !situation) {
            return res.status(400).json({
                success: false,
                message: '사용자 정보(userId)와 상황 정보(situation)가 필요합니다.'
            });
        }

        // 서버에 요청 - userId, situation을 ML API로 전달
        const response = await axios.post(ML_API_URL, {
            situation,
            userId: parseInt(userId)
        });
        
        // 응답 결과 세션에 임시 저장
        req.session.currentRecommendation = {
            userId: parseInt(userId),
            situation,
            ...response.data
        };

        res.json({
            success: true,
            message: '추천 요청이 성공적으로 전송되었습니다.'
        });
    } catch (error) {
        console.error('Send recommendation request error:', error);
        res.status(500).json({
            success: false,
            message: '추천 요청 전송에 실패했습니다.'
        });
    }
};

// 세션에 저장된 현재 추천 루틴 조회
exports.getCurrentRecommendation = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '사용자 정보(userId)가 필요합니다.'
            });
        }

        // 세션에 저장된 추천 결과 조회
        const recommendation = req.session.currentRecommendation;

        // 추천 루틴 결과가 없는 경우
        if (!recommendation) {
            return res.status(404).json({
                success: false,
                message: '현재 추천된 루틴이 없습니다.'
            });
        }
        
        // 추천 루틴 결과가 사용자 정보와 일치하지 않는 경우
        if (recommendation.userId !== parseInt(userId)) {
            return res.status(403).json({
                success: false,
                message: '잘못된 사용자의 접근입니다.'
            });
        }

        res.json({
            success: true,
            data: recommendation
        });
    } catch (error) {
        console.error('Get current recommendation error:', error);
        res.status(500).json({
            success: false,
            message: '현재 추천된 루틴 조회에 실패했습니다.'
        });
    }
}

// AI 루틴 추천 수락/적용
exports.acceptRecommendation = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '사용자 정보(userId)가 필요합니다.'
            });
        }

        const recommendation = req.session.currentRecommendation;

        // 수락할 루틴이 없는 경우
        if (!recommendation) {
            return res.status(404).json({
                success: false,
                message: '수락할 추천 루틴이 없습니다.'
            });
        }

        // 추천 루틴 결과가 사용자 정보와 일치하지 않는 경우
        if (recommendation.userId !== parseInt(userId)) {
            return res.status(403).json({
                success: false,
                message: '잘못된 사용자의 접근입니다.'
            });
        }

        // 전체 루틴 히스토리 개수 확인
        const totalRoutines = await db.RoutineHistory.count({
            where: {
                user_id: parseInt(userId)
            }
        });

        // 저장된 루틴이 하나라도 있을 때만 중복 체크
        if (totalRoutines > 0) {
            const existingRoutine = await db.RoutineHistory.findOne({
                where: {
                    user_id: parseInt(userId),
                    situation_txt: recommendation.situation,
                    routine_txt: recommendation.routine
                }
            });

            // 이미 동일한 상황-루틴 쌍이 있는 경우
            if (existingRoutine) {
                return res.status(409).json({
                    success: false,
                    message: '이미 동일한 상황에 대한 동일한 루틴이 존재합니다.'
                });
            }
        }

        // 새로운 추천 루틴을 RoutineHistory DB에 저장
        await db.RoutineHistory.create({
            user_id: userId,
            situation_txt: recommendation.situation,
            routine_txt: recommendation.routine,
            app_updates: recommendation.updates,
            result: 'success'
        });

        // 추천 루틴에 맞게 기기 상태 업데이트
        for (const update of recommendation.updates) {
            await db.Appliance.update(
                {
                    onoff: update.onoff,
                    state: update.state,
                    is_active: update.is_active
                },
                {
                    where: {
                        id: update.appliance_id,
                        user_id: parseInt(userId)
                    }
                }
            );
        }

        // 세션에서 추천 결과 삭제
        delete req.session.currentRecommendation;

        res.json({
            success: true,
            message: '추천 루틴이 성공적으로 수락/적용되었습니다.'
        });
    } catch (error) {  
        console.error('Accept recommendation error:', error);
        res.status(500).json({
            success: false,
            message: '추천 루틴 수락/적용에 실패했습니다.'
        });
    }
};

// AI 루틴 추천 거절
exports.rejectRecommendation = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '사용자 정보(userId)가 필요합니다.'
            });
        }

        // 거절할 루틴이 없는 경우
        const recommendation = req.session.currentRecommendation;
        if (!recommendation) {
            return res.status(404).json({
                success: false,
                message: '거절할 추천 루틴이 없습니다.'
            });
        }

        // 추천 루틴 결과가 사용자 정보와 일치하지 않는 경우
        if (recommendation.userId !== parseInt(userId)) {
            return res.status(403).json({
                success: false,
                message: '잘못된 사용자의 접근입니다.'
            });
        }

        // 세션에서 추천 결과 삭제
        delete req.session.currentRecommendation;

        res.json({
            success: true,
            message: '추천 루틴이 성공적으로 거절되었습니다.'
        });
    } catch (error) {
        console.error('Reject recommendation error:', error);
        res.status(500).json({
            success: false,
            message: '추천 루틴 거절에 실패했습니다.'
        });
    }
};

// AI 루틴 재추천 요청
exports.refreshRecommendation = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '사용자 정보(userId)가 필요합니다.'
            });
        }

        const currentRecommendation = req.session.currentRecommendation;
        if (!currentRecommendation) {
            return res.status(404).json({
                success: false,
                message: '루틴을 재추천하려면 먼저 추천 요청을 보내야 합니다.'
            });
        }

        if (currentRecommendation.userId !== parseInt(userId)) {
            return res.status(403).json({
                success: false,
                message: '잘못된 사용자의 접근입니다.'
            });
        }

        // 서버에 재요청 - userId, situation을 ML API로 전달 (동일 상황으로 새로운 루틴 추천 요청)
        const response = await axios.post(ML_API_URL, {
            situation: currentRecommendation.situation,
            userId: parseInt(userId)
        });
        const newRecommendation = response.data;

        // 세션 업데이트
        req.session.currentRecommendation = {
            userId: parseInt(userId),
            situation: currentRecommendation.situation,
            ...newRecommendation
        };

        res.json({
            success: true,
            message: '루틴이 성공적으로 재추천되었습니다.',
            data: {
                userId: userId,
                situation: currentRecommendation.situation,
                ...newRecommendation
            }
         });
    } catch (error) {
        console.error('Refresh recommendation error:', error);
        res.status(500).json({
            success: false,
            message: '루틴 재추천에 실패했습니다.'
        });
    }
}



// // 테스트용 코드 - 추후 삭제
// // 원본 코드는 주석처리하고, 테스트용 코드를 작성하는게 좋습니다.
// // 이렇게 하면 나중에 ML 서버가 다시 열렸을 때 쉽게 원복할 수 있습니다:

// const { db } = require('../models');
// const axios = require('axios');

// // const ML_API_URL = 'http://localhost:8000/recommend_routine/';

// // 테스트용 더미 데이터 - ML 서버 응답 형식과 동일하게 구성
// const TEST_RESPONSE = {
//    routine: "에어컨 24도로 켜고 TV를 킬게요.",
//    updates: [
//        {
//            appliance_id: 1,
//            user_id: 6,
//            name: "에어컨",
//            onoff: "on",
//            state: "24°C",
//            is_active: true
//        },
//        {
//            appliance_id: 4,
//            user_id: 6,
//            name: "TV",
//            onoff: "on",
//            state: "대기",
//            is_active: true
//        }
//    ]
// };

// const TEST_REFRESH_RESPONSE = {
//    routine: "에어컨을 26도로 설정하고 공기청정기를 켜드릴게요.",
//    updates: [
//        {
//            appliance_id: 1,
//            user_id: 6,
//            name: "에어컨",
//            onoff: "on",
//            state: "26°C",
//            is_active: true
//        },
//        {
//            appliance_id: 2,
//            user_id: 6,
//            name: "공기청정기",
//            onoff: "on",
//            state: "강풍",
//            is_active: true
//        }
//    ]
// };

// // AI 모델에 루틴 추천 요청 전송 (테스트용)
// exports.sendRecommendRequest = async (req, res) => {
//    try {
//        const { userId } = req.query;
//        const { situation } = req.body;
       
//        if (!userId || !situation) {
//            return res.status(400).json({
//                success: false,
//                message: '사용자 정보(userId)와 상황 정보(situation)가 필요합니다.'
//            });
//        }

//        // 테스트용 더미 데이터로 response.data 대체
//        const testData = {
//            ...TEST_RESPONSE,
//            updates: TEST_RESPONSE.updates.map(update => ({
//                ...update,
//                user_id: parseInt(userId)
//            }))
//        };
       
//        req.session.currentRecommendation = {
//            userId,
//            situation,
//            ...testData
//        };

//        res.json({
//            success: true,
//            message: '추천 요청이 성공적으로 전송되었습니다.'
//        });
//    } catch (error) {
//        console.error('Send recommendation request error:', error);
//        res.status(500).json({
//            success: false,
//            message: '추천 요청 전송에 실패했습니다.'
//        });
//    }
// };

// // 세션에 저장된 현재 추천 루틴 조회 (테스트용)
// exports.getCurrentRecommendation = async (req, res) => {
//    try {
//        const { userId } = req.query;

//        if (!userId) {
//            return res.status(400).json({
//                success: false,
//                message: '사용자 정보(userId)가 필요합니다.'
//            });
//        }

//        const recommendation = req.session.currentRecommendation;

//        if (!recommendation) {
//            return res.status(404).json({
//                success: false,
//                message: '현재 추천된 루틴이 없습니다.'
//            });
//        }
       
//        if (recommendation.userId !== userId) {
//            return res.status(403).json({
//                success: false,
//                message: '잘못된 사용자의 접근입니다.'
//            });
//        }

//        res.json({
//            success: true,
//            data: recommendation
//        });
//    } catch (error) {
//        console.error('Get current recommendation error:', error);
//        res.status(500).json({
//            success: false,
//            message: '현재 추천된 루틴 조회에 실패했습니다.'
//        });
//    }
// };

// // AI 루틴 추천 수락/적용 (테스트용)
// exports.acceptRecommendation = async (req, res) => {
//    try {
//        const { userId } = req.query;

//        if (!userId) {
//            return res.status(400).json({
//                success: false,
//                message: '사용자 정보(userId)가 필요합니다.'
//            });
//        }

//        const recommendation = req.session.currentRecommendation;

//        if (!recommendation) {
//            return res.status(404).json({
//                success: false,
//                message: '수락할 추천 루틴이 없습니다.'
//            });
//        }

//        if (recommendation.userId !== userId) {
//            return res.status(403).json({
//                success: false,
//                message: '잘못된 사용자의 접근입니다.'
//            });
//        }

//        await db.RoutineHistory.create({
//            user_id: userId,
//            situation_txt: recommendation.situation,
//            routine_txt: recommendation.routine,
//            app_updates: recommendation.updates,
//            result: 'success'
//        });

//        for (const update of recommendation.updates) {
//            await db.Appliance.update(
//                {
//                    onoff: update.onoff,
//                    state: update.state,
//                    is_active: update.is_active
//                },
//                {
//                    where: {
//                        id: update.appliance_id,
//                        user_id: parseInt(userId)
//                    }
//                }
//            );
//        }

//        delete req.session.currentRecommendation;

//        res.json({
//            success: true,
//            message: '추천 루틴이 성공적으로 수락/적용되었습니다.'
//        });
//    } catch (error) {  
//        console.error('Accept recommendation error:', error);
//        res.status(500).json({
//            success: false,
//            message: '추천 루틴 수락/적용에 실패했습니다.'
//        });
//    }
// };

// // AI 루틴 추천 거절 (테스트용)
// exports.rejectRecommendation = async (req, res) => {
//    try {
//        const { userId } = req.query;

//        if (!userId) {
//            return res.status(400).json({
//                success: false,
//                message: '사용자 정보(userId)가 필요합니다.'
//            });
//        }

//        const recommendation = req.session.currentRecommendation;
//        if (!recommendation) {
//            return res.status(404).json({
//                success: false,
//                message: '거절할 추천 루틴이 없습니다.'
//            });
//        }

//        if (recommendation.userId !== userId) {
//            return res.status(403).json({
//                success: false,
//                message: '잘못된 사용자의 접근입니다.'
//            });
//        }

//        delete req.session.currentRecommendation;

//        res.json({
//            success: true,
//            message: '추천 루틴이 성공적으로 거절되었습니다.'
//        });
//    } catch (error) {
//        console.error('Reject recommendation error:', error);
//        res.status(500).json({
//            success: false,
//            message: '추천 루틴 거절에 실패했습니다.'
//        });
//    }
// };

// // AI 루틴 재추천 요청 (테스트용)
// exports.refreshRecommendation = async (req, res) => {
//    try {
//        const { userId } = req.query;

//        if (!userId) {
//            return res.status(400).json({
//                success: false,
//                message: '사용자 정보(userId)가 필요합니다.'
//            });
//        }

//        const currentRecommendation = req.session.currentRecommendation;
//        if (!currentRecommendation) {
//            return res.status(404).json({
//                success: false,
//                message: '루틴을 재추천하려면 먼저 추천 요청을 보내야 합니다.'
//            });
//        }

//        if (currentRecommendation.userId !== userId) {
//            return res.status(403).json({
//                success: false,
//                message: '잘못된 사용자의 접근입니다.'
//            });
//        }

//        // 테스트용 더미 데이터로 response.data 대체
//        const testData = {
//            ...TEST_REFRESH_RESPONSE,
//            updates: TEST_REFRESH_RESPONSE.updates.map(update => ({
//                ...update,
//                user_id: parseInt(userId)
//            }))
//        };

//        req.session.currentRecommendation = {
//            userId,
//            situation: currentRecommendation.situation,
//            ...testData
//        };

//        res.json({
//            success: true,
//            message: '루틴이 성공적으로 재추천되었습니다.',
//            data: {
//                userId,
//                situation: currentRecommendation.situation,
//                ...testData
//            }
//        });
//    } catch (error) {
//        console.error('Refresh recommendation error:', error);
//        res.status(500).json({
//            success: false,
//            message: '루틴 재추천에 실패했습니다.'
//        });
//    }
// };
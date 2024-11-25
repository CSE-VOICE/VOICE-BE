const { db } = require('../models');
const { Op } = require('sequelize');

// 루틴 목록 조회
exports.getRoutineHistories = async (req, res) => {
    try {
        const { userId, keyword } = req.query; // 쿼리스트링으로 userId와 keyword(검색어)를 프론트에서 받아옴

        // 사용자 정보가 없는 경우
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '사용자 정보(userId)가 필요합니다.'
            });
        }

        // 검색 조건 설정
        let whereClause = { user_id: parseInt(userId) };
        if (keyword) {
            whereClause = {
                ...whereClause,
                situation_txt: { [Op.like]: `%${keyword}%` }
            };
        }

        // 루틴 목록 조회
        const histories = await db.RoutineHistory.findAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            attributes: ['id', 'created_at']
        });

        // 목록 번호 (오래된순으로 1번부터)
        const historiesWithNumber = histories.map((history, index) => ({
            number: histories.length - index, // 화면에 보여질 순번   
            routine_id: history.id, // DB상의 실제 ID
            created_at: history.created_at
        }))

        res.json({
            success: true, 
            data: historiesWithNumber
        });
    } catch (error) {
        console.error('Get routine histories error:', error);
        res.status(500).json({
            success: false,
            message: '루틴 목록 조회에 실패했습니다.'
        });
    }
};

// 루틴별 상세 조회 (특정 루틴 조회)
exports.getRoutineById = async (req, res) => {
    try {
        const { userId } = req.query; // 쿼리스트링으로 userId를 프론트에서 받아옴
        const { historyId } = req.params; // URL 파라미터로 historyId를 프론트에서 받아옴

        // 필수 값이 없는 경우
        if (!userId || !historyId) {
            return res.status(400).json({
                success: false,
                message: '사용자 정보(userId)와 루틴 정보(historyId)가 필요합니다.'
            });
        }

        // 전체 루틴 목록 조회하여 순번 찾기
        const allHistories = await db.RoutineHistory.findAll({
            where: { user_id: parseInt(userId) },
            order: [['created_at', 'DESC']],
            attributes: ['id']
        });

        const number = allHistories.length - allHistories.findIndex(history => history.id === parseInt(historyId));

        // 루틴 상세 조회
        const routine = await db.RoutineHistory.findOne({
            where: {
                id: parseInt(historyId),
                user_id: parseInt(userId)
            },
            attributes: ['id', 'situation_txt', 'routine_txt', 'app_updates']
        });

        // 루틴이 존재하지 않는 경우
        if (!routine) {
            return res.status(404).json({
                success: false,
                message: '해당 루틴을 찾을 수 없습니다.'
            });
        }

        res.json({
            success: true,
            data: {
                number,
                ...routine.dataValues
            }
        });
    } catch (error) {
        console.error('Get routine detail by id error:', error);
        res.status(500).json({
            success: false,
            message: '루틴 상세 정보 조회에 실패했습니다.'
        });
    }
};

// 특정 루틴 실행 (실행 버튼 클릭 시)
exports.executeRoutine = async (req, res) => {
    try {
        const { userId } = req.query; // 쿼리스트링으로 userId를 프론트에서 받아옴
        const { historyId } = req.params; // URL 파라미터로 historyId를 프론트에서 받아옴

        // 필수 값이 없는 경우
        if (!userId || !historyId) {
            return res.status(400).json({
                success: false,
                message: '사용자 정보(userId)와 루틴 정보(historyId)가 필요합니다.'
            });
        }

        // 실행할 루틴 조회
        const routine = await db.RoutineHistory.findOne({
            where: {
                id: parseInt(historyId),
                user_id: parseInt(userId)
            }
        });

        // 루틴이 존재하지 않는 경우
        if (!routine) {
            return res.status(404).json({
                success: false,
                message: '해당 루틴을 찾을 수 없습니다.'
            });
        }

        // app_updates 정보대로 기기 상태 업데이트
        const updates = routine.app_updates;
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
                        user_id: parseInt(userId)
                    }
                }
            );
        }

        // 실행 시간 업데이트
        const executedAt = new Date();
        await routine.update({
            executed_at: executedAt
        });

        // 전체 루틴 목록 조회해서 순번 찾기
        const allHistories = await db.RoutineHistory.findAll({
            where: { user_id: parseInt(userId) },
            order: [['created_at', 'DESC']],
            attributes: ['id']
        });

        // 화면에 보여질 순번 계산
        const number = allHistories.length - allHistories.findIndex(history => history.id === parseInt(historyId));

        res.json({
            success: true,
            message: '루틴이 성공적으로 실행되었습니다.',
            data: {
                number, // 화면에 보여질 순번
                id: parseInt(historyId),
                executed_at: executedAt
            }
        });
    } catch (error) {
        console.error('Execute routine error:', error);
        res.status(500).json({
            success: false,
            message: '루틴 실행에 실패했습니다.'
        });
    }
};

// 특정 루틴 삭제 (삭제 버튼 클릭 시)
exports.deleteRoutine = async (req, res) => {
    try {
        const { userId } = req.query; // 쿼리스트링으로 userId를 프론트에서 받아옴
        const { historyId } = req.params; // URL 파라미터로 historyId를 프론트에서 받아옴

        // 필수 값이 없는 경우
        if (!userId || !historyId) {
            return res.status(400).json({
                success: false,
                message: '사용자 정보(userId)와 루틴 정보(historyId)가 필요합니다.'
            });
        }

        // 삭제할 루틴 조회
        const routine = await db.RoutineHistory.findOne({
            where: {
                id: parseInt(historyId),
                user_id: parseInt(userId)
            }
        });

        // 루틴이 존재하지 않는 경우
        if (!routine) {
            return res.status(404).json({
                success: false,
                message: '해당 루틴을 찾을 수 없습니다.'
            });
        }

        // 전체 루틴 목록 조회해서 순번 찾기
        const allHistories = await db.RoutineHistory.findAll({
            where: { user_id: parseInt(userId) },
            order: [['created_at', 'DESC']],
            attributes: ['id']
        });

        // 화면에 보여질 순번 계산
        const number = allHistories.length - allHistories.findIndex(history => history.id === parseInt(historyId));

        // 루틴 삭제
        await routine.destroy();

        res.json({
            success: true,
            message: '루틴이 성공적으로 삭제되었습니다.',
            data: {
                number, // 화면에 보여질 순번
                id: parseInt(historyId)
            }
        });
    } catch (error) {
        console.error('Delete routine error:', error);
        res.status(500).json({
            success: false,
            message: '루틴 삭제에 실패했습니다.'
        });
    }
};
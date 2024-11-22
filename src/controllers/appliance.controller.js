const { db } = require('../models');

// 기기 목록 조회
exports.getAllAppliances = async (req, res) => {
    try {
        const { userId } = req.query; // 쿼리스트링으로 userId를 프론트에서 받아옴

        // 사용자 정보가 없는 경우
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '사용자 정보(userId)가 필요합니다.'
            });
        }

        // 사용자의 기기 목록 조회
        const appliances = await db.Appliance.findAll({
            attributes: ['id', 'name', 'onoff', 'state', 'img', 'is_active'],
            where: {
                user_id: userId
            }, 
            order: [['id', 'ASC']]
        });

        res.json({
            success: true,
            data: appliances
        });
    } catch (error) {
        console.error('Get all appliances error:', error);
        res.status(500).json({
            success: false,
            message: '기기 목록 조회에 실패했습니다.'
        });
    }
};

// 기기별 상세 조회 
exports.getApplianceById = async (req, res) => {
    try {
        const { applianceId } = req.params; // URL 파라미터로 applianceId를 프론트에서 받아옴
        const { userId } = req.query; // 쿼리스트링으로 userId를 프론트에서 받아옴

        // 사용자 정보가 없는 경우
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '사용자 정보(userId)가 필요합니다.'
            });
        }

        if (isNaN(applianceId)) {
            return res.status(400).json({
                success: false,
                message: '유효하지 않은 기기 ID입니다.'
            });
        }

        // 사용자의 기기 상세 조회
        const appliance = await db.Appliance.findOne({
            attributes: ['id', 'name', 'onoff', 'state', 'img', 'is_active'],
            where: {
                id: applianceId,
                user_id: userId
            }
        });

        // 기기가 존재하지 않는 경우
        if (!appliance) {
            return res.status(404).json({
                success: false,
                message: '존재하지 않는 기기입니다.'
            });
        }

        res.json({
            success: true,
            data: appliance
        });
    } catch (error) {
        console.error('Get appliance by id error:', error);
        res.status(500).json({
            success: false,
            message: '기기 상세 조회에 실패했습니다.'
        });
    }
};

// 기기별 전원 제어
exports.controlAppliancePower = async (req, res) => {
    try {
        const { applianceId } = req.params;
        const { userId } = req.query;
        const { power } = req.body; // 'on' 또는 'off'

        // 입력값 검증
        if (!userId || !applianceId || !power) {
            return res.status(400).json({
                success: false,
                message: '사용자 정보(userId), 기기 정보(applianceId), 전원 상태(power)가 필요합니다.'
            });
        }

        if (isNaN(applianceId)) {
            return res.status(400).json({
                success: false,
                message: '유효하지 않은 기기 ID입니다.'
            });
        }

        if (!['on', 'off'].includes(power)) {
            return res.status(400).json({
                success: false,
                message: '전원 상태(power)는 "on" 또는 "off"만 가능합니다.'
            });
        }

        // 해당 기기 조회
        const appliance = await db.Appliance.findOne({
            where: {
                id: applianceId,
                user_id: userId
            }
        });

        if (!appliance) {
            return res.status(404).json({
                success: false,
                message: '존재하지 않는 기기입니다.'
            });
        }

        // 기기 상태 업데이트
        const updatedAppliance = await appliance.update({
            onoff: power,
            state: '대기', 
            is_active: power === 'on',
            updated_at: new Date()
        });

        res.json({
            success: true,
            data: updatedAppliance
        });
    } catch (error) {
        console.error('Control appliance power error:', error);
        res.status(500).json({
            success: false,
            message: '기기 전원 제어에 실패했습니다.'
        });
    }
}

// 기기 변동사항 업데이트
exports.updateAppliances = async (req, res) => {
    try {
        const { userId } = req.query;
        const { updates } = req.body;

        // 사용자 정보가 없는 경우
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '사용자 정보(userId)가 필요합니다.'
            });
        }

        // 업데이트할 기기 정보가 없는 경우
        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: '업데이트할 기기 정보가 필요합니다.'
            });
        }

        // 기기 정보 업데이트를 순차적으로 처리
        const updatedAppliances = [];
        for (const update of updates) {
            const { applianceId, onoff, state, isActive } = update; 

            // 기기 ID가 없는 경우
            if (!applianceId || isNaN(applianceId)) {
                return res.status(400).json({
                    success: false,
                    message: '유효하지 않은 기기 ID입니다.'
                });
            }

            // 해당 기기가 존재하는지 확인
            const appliance = await db.Appliance.findOne({
                where: {
                    id: applianceId,
                    user_id: userId
                }
            });

            // 기기가 존재하지 않는 경우
            if (!appliance) {
                return res.status(404).json({
                    success: false,
                    message: `ID ${applianceId}의 기기를 찾을 수 없습니다.`
                });
            }

            // 업데이트할 필드를 객체로 구성
            const updateFields = {
                updated_at: new Date()  
            };
            if (onoff !== undefined) updateFields.onoff = onoff;
            if (state !== undefined) updateFields.state = state;
            if (isActive !== undefined) updateFields.is_active = isActive;

            // 기기 정보 업데이트
            const updatedAppliance = await appliance.update(updateFields);
            updatedAppliances.push(updatedAppliance);
        }

        res.json({
            success: true,
            data: updatedAppliances
        });
    } catch (error) {
        console.error('Update appliances error:', error);
        res.status(500).json({
            success: false,
            message: '기기 정보 업데이트에 실패했습니다.'
        });
    }
};
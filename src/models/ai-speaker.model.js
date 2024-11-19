module.exports = (sequelize, Sequelize) => {
    const AiSpeaker = sequelize.define("ai_speakers", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        name: {
            type: Sequelize.STRING(100),
            allowNull: false
        },
        conn_status: {
            type: Sequelize.ENUM('connected', 'disconnected'),
            allowNull: false
        },
        is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false
        },
        created_at: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        }
    }, {
        timestamps: false
    });

    return AiSpeaker;
};
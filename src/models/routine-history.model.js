module.exports = (sequelize, Sequelize) => {
    const RoutineHistory = sequelize.define("routine_histories", {
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
        situation_txt: {
            type: Sequelize.STRING(500),
            allowNull: false
        },
        routine_txt: {
            type: Sequelize.STRING(500),
            allowNull: false
        },
        app_updates: {
            type: Sequelize.JSON,
            allowNull: false
        },
        result: {
            type: Sequelize.ENUM('success', 'failed'),
            allowNull: false
        },
        created_at: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        },
        executed_at: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        }
    }, {
        timestamps: false
    });

    return RoutineHistory;
};
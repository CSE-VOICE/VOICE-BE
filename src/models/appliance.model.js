module.exports = (sequelize, Sequelize) => {
    const Appliance = sequelize.define("appliances", {
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
            type: Sequelize.STRING(50),
            allowNull: false
        },
        onoff: {
            type: Sequelize.ENUM('on', 'off'),
            allowNull: false
        },
        state: {
            type: Sequelize.STRING(100),
            allowNull: true
        },
        img: {
            type: Sequelize.STRING(255),
            allowNull: false
        }, 
        is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false
        },
        created_at: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        },
        updated_at: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        }
    }, {
        timestamps: false
    });

    return Appliance;
};
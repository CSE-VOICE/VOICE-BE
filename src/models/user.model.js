module.exports = (sequelize, Sequelize) => {
    const User = sequelize.define("users", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        email: {
            type: Sequelize.STRING(255),
            allowNull: false,
            unique: true
        },
        pwd: {
            type: Sequelize.STRING(255),
            allowNull: false
        },
        phone: {
            type: Sequelize.STRING(20),
            allowNull: false
        },
        name: {     
            type: Sequelize.STRING(50),
            allowNull: false
        },
        login_type: {
            type: Sequelize.ENUM('local', 'google', 'kakao', 'naver'),
            allowNull: false
        },
        created_at: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        }
    }, {
        timestamps: false
    });

    return User;
};
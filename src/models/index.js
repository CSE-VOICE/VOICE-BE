const { Sequelize } = require('sequelize');
require('dotenv').config();

// DB 연결 정보 설정
const dbConfig = {
    HOST: process.env.DB_HOST,
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASS,
    DB: process.env.DB_NAME,
    dialect: 'mysql',
    // 아래 설정들 추가
    timezone: '+09:00',
    dialectOptions: {
        charset: 'utf8mb4',
        dateStrings: true,
        typeCast: true
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
}

// Sequelize 객체 생성
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
    host: dbConfig.HOST,
    dialect: dbConfig.dialect,
    timezone: dbConfig.timezone,
    dialectOptions: dbConfig.dialectOptions,
    pool: dbConfig.pool
});

// DB 객체 생성
const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// models 추가 
db.User = require('./user.model.js')(sequelize, Sequelize);
db.Appliance = require('./appliance.model.js')(sequelize, Sequelize);
db.AiSpeaker = require('./ai-speaker.model.js')(sequelize, Sequelize);
db.RoutineHistory = require('./routine-history.model.js')(sequelize, Sequelize);

// 관계 설정
db.User.hasMany(db.Appliance, { foreignKey: 'user_id' });
db.Appliance.belongsTo(db.User, { foreignKey: 'user_id' });

db.User.hasMany(db.AiSpeaker, { foreignKey: 'user_id' });
db.AiSpeaker.belongsTo(db.User, { foreignKey: 'user_id' });

db.User.hasMany(db.RoutineHistory, { foreignKey: 'user_id' });
db.RoutineHistory.belongsTo(db.User, { foreignKey: 'user_id' });

module.exports = { db };
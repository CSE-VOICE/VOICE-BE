require('dotenv').config();
const { Sequelize } = require('sequelize');
require('dotenv').config();

// DB 연결 정보 설정
const dbConfig = {
    HOST: process.env.DB_HOST,
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASS,
    DB: process.env.DB_NAME,
    dialect: 'mysql'
}

// Sequelize 객체 생성
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
    host: dbConfig.HOST,
    dialect: dbConfig.dialect
});

// DB 객체 생성
const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// models 추가 예정

// DB 연결 테스트 함수
const initializeDB = async () => {
    try {
        await db.sequelize.authenticate();
        console.log('Database connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error.message);  // error.message 추가
        console.error('Error details:', error);  // 전체 에러 객체 출력
        process.exit(1);
    }
};

module.exports = { db, initializeDB };
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { db } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors()); // CORS 활성화
app.use(morgan('dev')); // 로그 출력
app.use(express.json()); 

// 라우트 설정
const routes = require('./routes');
app.use(routes);

// 에러 처리 미들웨어
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('서버 에러 발생');
});

// 서버 시작 함수
const startServer = async () => {
    try {
        // DB 연결
        await db.sequelize.authenticate();
        console.log('Database connection has been established successfully.');
        
        // 서버 시작
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
 };

startServer();
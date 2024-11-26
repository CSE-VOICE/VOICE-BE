require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const morgan = require('morgan');
const { db } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors()); // CORS 활성화
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false}
}));
app.use(morgan('dev')); // 로그 출력
// app.use(express.json()); 
app.use(express.json({ limit: '10mb' })); // JSON 파싱 + 용량 제한 설정
app.use(express.urlencoded({ limit: '10mb', extended: true})); // URL 인코딩 파싱
app.use('/uploads', express.static('src/uploads')); // 정적 파일 제공

// 라우트 설정
const routes = require('./routes');
app.use(routes);

// 에러 처리 미들웨어
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({  // JSON 형식으로 응답 변경
        success: false,
        message: '서버 에러가 발생했습니다.'
    });
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
            console.log(`Connected to DB at ${process.env.DB_HOST}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
 };

startServer();
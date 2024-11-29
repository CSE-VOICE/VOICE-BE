const bcrypt = require('bcryptjs');
const { db } = require('../models');

// 회원가입
exports.signup = async (req, res) => {
    try {
        const { email, pwd, phone, name, login_type } = req.body;

        // 이메일 중복 체크
        const existingUser = await db.User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "이미 존재하는 이메일입니다."
            });
        }

        // 비밃번호 암호화
        const hashedPassword = await bcrypt.hash(pwd, 12);

        // 유저 생성
        const user = await db.User.create({
            email,
            pwd: hashedPassword,
            phone,
            name,
            login_type
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: '회원가입에 실패했습니다.'
        });
    }
};

// 로그인
exports.login = async (req, res) => {
    try {
        const { email, pwd, login_type } = req.body;

        // 유저 조회
        const user = await db.User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "존재하지 않는 이메일입니다."
            });
        }

        // 비밀번호 체크
        const passwordEqual = await bcrypt.compare(pwd, user.pwd);
        if (!passwordEqual) {
            return res.status(400).json({
                success: false,
                message: "비밀번호가 올바르지 않습니다."
            });
        }

        // 로그인 성공
        res.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                login_type: user.login_type
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: '로그인에 실패했습니다.'
        });
    }
};
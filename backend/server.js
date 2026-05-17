const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Подключение к PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'dental_clinic',
});

// Проверка подключения
pool.connect((err) => {
    if (err) console.error('Ошибка подключения к БД:', err);
    else console.log('Подключено к PostgreSQL');
});

const JWT_SECRET = process.env.JWT_SECRET || 'my_secret_key_123';

// Middleware для проверки токена
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет токена' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Неверный токен' });
    }
};

// ========== API РОУТЫ ==========

// 1. Регистрация
app.post('/api/register', async (req, res) => {
    const { email, password, fullname, phone } = req.body;
    if (!email || !password || !fullname) {
        return res.status(400).json({ error: 'Заполните все поля' });
    }
    try {
        const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Email уже зарегистрирован' });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, fullname, phone) VALUES ($1, $2, $3, $4) RETURNING id, email, fullname, phone',
            [email, passwordHash, fullname, phone || null]
        );
        const user = result.rows[0];
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email: user.email, fullname: user.fullname, phone: user.phone } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 2. Вход
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Заполните поля' });
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Неверный email или пароль' });
        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Неверный email или пароль' });
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email: user.email, fullname: user.fullname, phone: user.phone } });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 3. Получить профиль пользователя
app.get('/api/user/profile', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, email, fullname, phone, created_at FROM users WHERE id = $1', [req.userId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 4. Обновить профиль
app.put('/api/user/profile', authMiddleware, async (req, res) => {
    const { fullname, phone } = req.body;
    try {
        await pool.query('UPDATE users SET fullname = $1, phone = $2 WHERE id = $3', [fullname, phone, req.userId]);
        res.json({ message: 'Профиль обновлён' });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 5. Получить всех врачей
app.get('/api/doctors', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM doctors ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 6. Получить все услуги
app.get('/api/services', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM services ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 7. Создать запись на приём
app.post('/api/appointments', authMiddleware, async (req, res) => {
    const { doctor_id, service_id, appointment_date } = req.body;
    if (!appointment_date) return res.status(400).json({ error: 'Выберите дату' });
    try {
        const result = await pool.query(
            'INSERT INTO appointments (user_id, doctor_id, service_id, appointment_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.userId, doctor_id || null, service_id || null, appointment_date, 'ожидает']
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 8. Получить историю записей пользователя
app.get('/api/appointments', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*, d.fullname as doctor_name, s.name as service_name 
            FROM appointments a
            LEFT JOIN doctors d ON a.doctor_id = d.id
            LEFT JOIN services s ON a.service_id = s.id
            WHERE a.user_id = $1
            ORDER BY a.appointment_date DESC
        `, [req.userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 9. Добавить отзыв
app.post('/api/reviews', authMiddleware, async (req, res) => {
    const { doctor_id, rating, comment } = req.body;
    if (!doctor_id || !rating) return res.status(400).json({ error: 'Укажите врача и оценку' });
    try {
        const result = await pool.query(
            'INSERT INTO reviews (user_id, doctor_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.userId, doctor_id, rating, comment || null]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 10. Получить отзывы о враче
app.get('/api/reviews/doctor/:doctorId', async (req, res) => {
    const { doctorId } = req.params;
    try {
        const result = await pool.query(`
            SELECT r.*, u.fullname as user_name 
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.doctor_id = $1
            ORDER BY r.created_at DESC
        `, [doctorId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`));
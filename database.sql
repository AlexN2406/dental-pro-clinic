-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    fullname VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица врачей
CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    fullname VARCHAR(255) NOT NULL,
    specialization VARCHAR(255) NOT NULL,
    experience INTEGER,
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица услуг
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price INTEGER,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица записей на приём
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctors(id),
    service_id INTEGER REFERENCES services(id),
    appointment_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'ожидает',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица отзывов
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctors(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Добавляем тестовых врачей
INSERT INTO doctors (fullname, specialization, experience, photo_url) VALUES
('Антонова Елена Викторовна', 'Терапевтическая стоматология', 14, 'doctor_female'),
('Морозов Дмитрий Игоревич', 'Хирургия, имплантация', 10, 'doctor_male'),
('Лебедева Анна Сергеевна', 'Ортодонтия', 8, 'doctor_female'),
('Кузнецов Павел Андреевич', 'Ортопедия', 12, 'doctor_male'),
('Соколова Мария Дмитриевна', 'Детская стоматология', 7, 'doctor_female');

-- Добавляем тестовые услуги
INSERT INTO services (name, description, price, category) VALUES
('Терапевтическая стоматология', 'Лечение кариеса, пульпита', 3500, 'treatment'),
('Хирургическая стоматология', 'Удаление зубов, имплантация', 5000, 'surgery'),
('Ортопедическая стоматология', 'Коронки, мосты, протезы', 8000, 'orthopedic'),
('Ортодонтия', 'Брекеты, элайнеры', 25000, 'orthodontic'),
('Детская стоматология', 'Лечение молочных зубов', 2500, 'pediatric');
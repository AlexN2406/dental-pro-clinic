// api.js - подключение к backend серверу

const API_URL = 'https://dental-pro-g0qv.onrender.com/api';

// Сохранение токена
function setToken(token) {
    if (token) {
        sessionStorage.setItem('token', token);
    } else {
        sessionStorage.removeItem('token');
    }
}

function getToken() {
    return sessionStorage.getItem('token');
}

// Универсальная функция для запросов
async function request(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Ошибка запроса');
    }
    
    return data;
}

// API методы
const api = {
    // Регистрация
    register: (email, password, fullname, phone) => {
        return request('/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, fullname, phone })
        });
    },
    
    // Вход
    login: (email, password) => {
        return request('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },
    
    // Получить профиль
    getProfile: () => {
        return request('/user/profile');
    },
    
    // Обновить профиль
    updateProfile: (fullname, phone) => {
        return request('/user/profile', {
            method: 'PUT',
            body: JSON.stringify({ fullname, phone })
        });
    },
    
    // Получить всех врачей
    getDoctors: () => {
        return request('/doctors');
    },
    
    // Получить все услуги
    getServices: () => {
        return request('/services');
    },
    
    // Создать запись на приём
    createAppointment: (doctor_id, service_id, appointment_date) => {
        return request('/appointments', {
            method: 'POST',
            body: JSON.stringify({ doctor_id, service_id, appointment_date })
        });
    },
    
    // Получить историю записей
    getAppointments: () => {
        return request('/appointments');
    },
    
    // Добавить отзыв
    addReview: (doctor_id, rating, comment) => {
        return request('/reviews', {
            method: 'POST',
            body: JSON.stringify({ doctor_id, rating, comment })
        });
    },
    
    // Получить отзывы о враче
    getDoctorReviews: (doctorId) => {
        return request(`/reviews/doctor/${doctorId}`);
    }
};
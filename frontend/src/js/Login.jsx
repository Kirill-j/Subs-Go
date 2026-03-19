import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from './AuthContext.jsx';
import '../App.css';

const Login = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [serverError, setServerError] = useState('');
    const [message, setMessage] = useState('');

    const navigate = useNavigate();
    const location = useLocation();
    const { setUser, setToken } = useContext(AuthContext);

    const phonePattern = /^\+\d{1,3}\d{3}-\d{3}-\d{2}-\d{2}$/;

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const error = params.get('error');
        const logout = params.get('logout');

        if (error) {
            if (error.includes('формата номера телефона')) {
                setPhoneError(error);
            } else {
                setServerError(error);
            }
        }

        if (logout) {
            setMessage('Вы успешно вышли из системы');
            const timer = setTimeout(() => setMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        setPhoneError('');
        setPasswordError('');
        setServerError('');
        setMessage('');

        let isValid = true;

        if (!phoneNumber) {
            setPhoneError('Поле не может быть пустым');
            isValid = false;
        } else if (!phonePattern.test(phoneNumber)) {
            setPhoneError('Неверный формат номера телефона. Используйте формат: +7XXX-XXX-XX-XX');
            isValid = false;
        }

        if (!password) {
            setPasswordError('Поле не может быть пустым');
            isValid = false;
        }

        if (!isValid) return;

        try {
            const response = await axios.post(
                'http://localhost:8080/api/public/login',
                { phoneNumber, password },
                { withCredentials: true }
            );

            console.log('Login response:', response.data);

            if (response.data.status === 'success') {
                const token = response.data.token;
                setToken(token);
                const userResponse = await axios.get('http://localhost:8080/api/users/me', {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true
                });
                console.log('User data after login:', userResponse.data);
                setUser(userResponse.data);
                navigate('/');
            } else {
                setServerError(response.data.message || 'Неверный номер телефона или пароль');
                setTimeout(() => setServerError(''), 3000);
            }
        } catch (error) {
            console.error('Login error:', {
                status: error.response?.status,
                message: error.message,
                data: error.response?.data
            });
            const errorMessage = error.response?.data?.message ||
                (error.message === 'Network Error'
                    ? 'Не удалось подключиться к серверу. Проверьте соединение.'
                    : 'Ошибка входа. Попробуйте снова.');
            setServerError(errorMessage);
            setTimeout(() => setServerError(''), 3000);
        }
    };

    const handlePhoneChange = (e) => {
        const input = e.target.value.replace(/\D/g, ''); // Только цифры
         let formatted = '';

        if (input.length > 0) {
            formatted = '+7';
            // Убираем первую цифру, если это 7 или 8, чтобы не было +77...
            const selection = (input[0] === '7' || input[0] === '8') ? input.substring(1) : input;

            if (selection.length > 0) formatted += selection.substring(0, 3);
            if (selection.length >= 4) formatted += '-' + selection.substring(3, 6);
            if (selection.length >= 7) formatted += '-' + selection.substring(6, 8);
            if (selection.length >= 9) formatted += '-' + selection.substring(8, 10);
        }
        setPhoneNumber(formatted);
    };

    return (
        <div className="container">
            {message && <div className="success-message animate-in">{message}</div>}
            {serverError && <div className="form-error-block">{serverError}</div>}
            <form onSubmit={handleSubmit} className="login-form" id="loginForm" noValidate>
                <h1>Вход в систему</h1>
                <div className="input-label">
                    {phoneError && <span className="form-error-tooltip">{phoneError}</span>}
                    <label>
                        Номер телефона:
                        <input
                            type="text"
                            value={phoneNumber}
                            onChange={handlePhoneChange}
                            placeholder="+7XXX-XXX-XX-XX"
                            aria-invalid={phoneError ? 'true' : 'false'}
                        />
                    </label>
                </div>
                <div className="input-label">
                    {passwordError && <span className="form-error-tooltip">{passwordError}</span>}
                    <label>
                        Пароль:
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            aria-invalid={passwordError ? 'true' : 'false'}
                        />
                    </label>
                </div>
                <button type="submit" className="btn primary">Войти</button>
                <Link to="/register" className="btn secondary">Зарегистрироваться</Link>
            </form>
        </div>
    );
};

export default Login;
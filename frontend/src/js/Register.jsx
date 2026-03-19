import { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import '../App.css';

const Register = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [nameError, setNameError] = useState('');
    const [serverError, setServerError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const { setUser, setToken } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        setPhoneError('');
        setPasswordError('');
        setNameError('');
        setServerError('');
        setSuccessMessage('');

        const phonePattern = /^\+7\d{3}-\d{3}-\d{2}-\d{2}$/;
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

        if (!name.trim()) {
            setNameError('Поле не может быть пустым');
            isValid = false;
        }

        if (!isValid) return;

        try {
            const response = await axios.post(
                'http://localhost:8080/api/public/register',
                { phoneNumber, password, name: name.trim() },
                { withCredentials: true }
            );

            if (response.data.status === 'success') {
                // Assuming the registration response includes a token
                const token = response.data.token;
                if (token) {
                    setToken(token); // Store the token in AuthContext
                }

                // Fetch user data after registration
                const userResponse = await axios.get('http://localhost:8080/api/users/me', {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true
                });

                setUser(userResponse.data);
                setSuccessMessage('Регистрация успешна! Выполняется вход...');
                setTimeout(() => {
                    navigate('/');
                }, 2000); // Redirect after 2 seconds to show the success message
            } else {
                setServerError(response.data.message || 'Ошибка регистрации');
                setTimeout(() => setServerError(''), 3000);
            }
        } catch (err) {
            console.error('Registration error:', {
                status: err.response?.status,
                message: err.message,
                data: err.response?.data
            });
            const errorMessage = err.response?.data?.message ||
                (err.message === 'Network Error'
                    ? 'Не удалось подключиться к серверу. Проверьте соединение.'
                    : 'Ошибка регистрации. Попробуйте снова.');
            setServerError(errorMessage);
            setTimeout(() => setServerError(''), 3000);
        }
    };

    const handlePhoneChange = (e) => {
        const input = e.target.value.replace(/\D/g, '');
        let formatted = '';
        if (input.length > 0) {
            formatted = '+7';
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
            <h2>Регистрация</h2>
            {serverError && <div className="form-error-block">{serverError}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}
            <form onSubmit={handleSubmit} className="register-form" noValidate>
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
                <div className="input-label">
                    {nameError && <span className="form-error-tooltip">{nameError}</span>}
                    <label>
                        Имя:
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            aria-invalid={nameError ? 'true' : 'false'}
                        />
                    </label>
                </div>
                <button type="submit" className="btn primary">Зарегистрироваться</button>
                <Link to="/login" className="btn secondary">Уже есть аккаунт? Войти</Link>
            </form>
        </div>
    );
};

export default Register;
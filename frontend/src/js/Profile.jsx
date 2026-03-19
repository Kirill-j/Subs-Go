import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from './AuthContext.jsx';
import Chart from 'chart.js/auto';
import '../App.css';
import ProfileEditModal from './ProfileEditModal.jsx';

const Profile = () => {
    const { user, token, setUser, loading, logout, updateUserAndRelogin } = useContext(AuthContext);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        phoneNumber: user?.phoneNumber || '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [serverError, setServerError] = useState('');
    const [subscriptions, setSubscriptions] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const chartRefPeriod = useRef(null);
    const chartRefCost = useRef(null);

    useEffect(() => {
        if (loading) return;
        if (!token) {
            navigate('/login');
            return;
        }

        if (!user) {
            axios.get('http://localhost:8080/api/users/me', {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true
            })
            .then(response => {
                setUser(response.data);
                setFormData({
                    name: response.data.name || '',
                    phoneNumber: response.data.phoneNumber || '',
                    password: ''
                });
            })
            .catch(error => {
                console.error('Ошибка загрузки данных пользователя:', error);
                navigate('/login');
            });
        } else {
            setFormData({
                name: user.name || '',
                phoneNumber: user.phoneNumber || '',
                password: ''
            });
        }

        axios.get('http://localhost:8080/api/subscription', {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
        })
        .then(response => {
            setSubscriptions(response.data.subscriptions || []);
            computeStatistics(response.data.subscriptions || []);
        })
        .catch(error => {
            console.error('Ошибка загрузки подписок:', error);
            setServerError('Не удалось загрузить данные для статистики');
            setTimeout(() => setServerError(''), 3000);
        });
    }, [user, token, loading, navigate, setUser]);

    const computeStatistics = (subs) => {
        if (!subs || subs.length === 0) {
            setStatistics({
                totalSubscriptions: 0,
                totalCost: 0,
                averageCost: 0,
                mostExpensive: null,
                oldest: null
            });
            return;
        }

        const totalSubscriptions = subs.length;
        const totalCost = subs.reduce((sum, sub) => sum + parseFloat(sub.cost), 0);
        const averageCost = totalCost / totalSubscriptions;
        const mostExpensive = subs.reduce((max, sub) => 
            parseFloat(sub.cost) > parseFloat(max.cost) ? sub : max, subs[0]);
        const oldest = subs.reduce((oldest, sub) => 
            new Date(sub.startDate) < new Date(oldest.startDate) ? sub : oldest, subs[0]);

        const monthlyCount = subs.filter(sub => sub.period === 'MONTHLY').length;
        const yearlyCount = subs.filter(sub => sub.period === 'YEARLY').length;

        const monthlyCost = subs
            .filter(sub => sub.period === 'MONTHLY')
            .reduce((sum, sub) => sum + parseFloat(sub.cost), 0);
        const yearlyCost = subs
            .filter(sub => sub.period === 'YEARLY')
            .reduce((sum, sub) => sum + parseFloat(sub.cost), 0);

        setStatistics({
            totalSubscriptions,
            totalCost: totalCost.toFixed(2),
            averageCost: averageCost.toFixed(2),
            mostExpensive,
            oldest,
            monthlyCount,
            yearlyCount,
            monthlyCost: monthlyCost.toFixed(2),
            yearlyCost: yearlyCost.toFixed(2)
        });

        if (chartRefPeriod.current) {
            if (chartRefPeriod.current.chart) chartRefPeriod.current.chart.destroy();
            chartRefPeriod.current.chart = new Chart(chartRefPeriod.current, {
                type: 'pie',
                data: {
                    labels: ['Ежемесячно', 'Ежегодно'],
                    datasets: [{
                        data: [monthlyCount, yearlyCount],
                        backgroundColor: ['#3b82f6', '#ef4444'],
                        borderColor: ['#fff', '#fff'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 500,
                        easing: 'easeOutQuart',
                        onComplete: () => console.log('Chart Period animation complete')
                    },
                    plugins: {
                        legend: { position: 'top', labels: { font: { size: 14, family: 'Inter' } } },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.label}: ${context.parsed.toFixed(2)}`
                            }
                        }
                    }
                }
            });
        }

        if (chartRefCost.current) {
            if (chartRefCost.current.chart) chartRefCost.current.chart.destroy();
            chartRefCost.current.chart = new Chart(chartRefCost.current, {
                type: 'pie',
                data: {
                    labels: ['Ежемесячно', 'Ежегодно'],
                    datasets: [{
                        data: [monthlyCost, yearlyCost],
                        backgroundColor: ['#fbbf24', '#f87171'],
                        borderColor: ['#fff', '#fff'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 500,
                        easing: 'easeOutQuart',
                        onComplete: () => console.log('Chart Cost animation complete')
                    },
                    plugins: {
                        legend: { position: 'top', labels: { font: { size: 14, family: 'Inter' } } },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.label}: ${context.parsed.toFixed(2)} руб.`
                            }
                        }
                    }
                }
            });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    // Добавляем функцию маски для телефона здесь, чтобы передать в Modal
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
        setFormData(prev => ({ ...prev, phoneNumber: formatted }));
        setErrors(prev => ({ ...prev, phoneNumber: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setServerError('');
        setMessage('');

        const newErrors = {};
        const phonePattern = /^\+7\d{3}-\d{3}-\d{2}-\d{2}$/;

        // 1. ПРЕДВАРИТЕЛЬНАЯ ВАЛИДАЦИЯ (До запроса в БД)
        if (!formData.name.trim()) newErrors.name = 'Поле не может быть пустым';
        if (!formData.phoneNumber || !phonePattern.test(formData.phoneNumber)) {
            newErrors.phoneNumber = 'Неверный формат номера. Используйте: +7XXX-XXX-XX-XX';
        }
        
        // КРИТИЧЕСКИЙ ФИКС: Если номер меняется, пароль ОБЯЗАТЕЛЕН до отправки запроса
        if (formData.phoneNumber !== user.phoneNumber && !formData.password) {
            newErrors.password = 'Для изменения номера телефона необходимо указать текущий пароль';
        }

        if (formData.password && formData.password.length < 6) {
            newErrors.password = 'Пароль должен содержать минимум 6 символов';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            const payload = {
                name: formData.name.trim(),
                phoneNumber: formData.phoneNumber,
                ...(formData.password && { password: formData.password })
            };

            const response = await axios.put(
                'http://localhost:8080/api/users/update',
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                }
            );

            // Если номер изменился, выполняем relogin с НОВЫМ номером
            if (formData.phoneNumber !== user.phoneNumber) {
                setMessage('Данные изменены. Обновление сессии...');
                await updateUserAndRelogin(formData.phoneNumber, formData.password);
            } else {
                setUser({ ...user, name: payload.name, phoneNumber: payload.phoneNumber });
                setMessage('Данные успешно обновлены');
            }

            setIsModalOpen(false);
            setFormData((prev) => ({ ...prev, password: '' }));
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error('Ошибка обновления профиля:', err);
            if (err.response?.status === 403) {
                setServerError('Ошибка доступа. Возможно, пароль неверен или сессия истекла.');
            } else {
                const errorData = err.response?.data || { error: 'Ошибка обновления профиля' };
                setErrors(prev => ({...prev, ...errorData}));
            }
            setTimeout(() => setServerError(''), 3000);
        }
    };

    const formatDate = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    if (loading) return <div className="container">Загрузка...</div>;

    return (
        <div className="container">
            <div className="greeting-block">
                <h1>Личный кабинет</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn secondary" onClick={() => { logout(); navigate('/login'); }}>
                        Выйти
                    </button>
                    <button className="btn primary" onClick={() => navigate('/')}>
                        К подпискам
                    </button>
                </div>
            </div>

            <div className="content-wrapper">
                <div className="profile-info">
                    {message && <div className="success-message animate-in">{message}</div>}
                    {serverError && <div className="form-error-block">{serverError}</div>}
                    <p><strong>Имя:</strong> {user?.name || 'Не указано'}</p>
                    <p><strong>Телефон:</strong> {user?.phoneNumber || 'Не указан'}</p>
                    <button className="btn primary" onClick={() => setIsModalOpen(true)}>
                        Редактировать профиль
                    </button>
                </div>
                <div className="stats-block-profile">
                    <h2>Детализированная статистика</h2>
                    {subscriptions.length === 0 ? (
                        <div className="empty-message">Нет данных для отображения</div>
                    ) : (
                        <>
                            <div className="stats-details">
                                <p><strong>Общее количество подписок:</strong> {statistics?.totalSubscriptions}</p>
                                <p><strong>Общая стоимость:</strong> {statistics?.totalCost} руб.</p>
                                <p><strong>Средняя стоимость:</strong> {statistics?.averageCost} руб.</p>
                                {statistics?.mostExpensive && (
                                    <p><strong>Самая дорогая:</strong> {statistics.mostExpensive.name} ({statistics.mostExpensive.cost} руб.)</p>
                                )}
                                {statistics?.oldest && (
                                    <p><strong>Самая старая:</strong> {statistics.oldest.name} (начало: {formatDate(statistics.oldest.startDate)})</p>
                                )}
                            </div>
                            <div className="charts-row">
                                <div className="chart-container">
                                    <h3>Распределение подписок по периоду</h3>
                                    <div className="chart-wrapper">
                                        <canvas ref={chartRefPeriod}></canvas>
                                    </div>
                                </div>
                                <div className="chart-container">
                                    <h3>Затраты по периоду</h3>
                                    <div className="chart-wrapper">
                                        <canvas ref={chartRefCost}></canvas>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <ProfileEditModal
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    setErrors={setErrors}
                    handleChange={handleChange}
                    handlePhoneChange={handlePhoneChange} // Передаем новую функцию
                    handleSubmit={handleSubmit}
                    setIsModalOpen={setIsModalOpen}
                    token={token}
                />
            )}
        </div>
    );
};

export default Profile;
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from './AuthContext.jsx';
import '../App.css';

const AddSubscriptionModal = ({ isOpen, onClose, fetchSubscriptions }) => {
    const [formData, setFormData] = useState({
        name: '',
        cost: '',
        period: '',
        startDate: '',
        endDate: ''
    });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const { user, token, loading } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isOpen || loading) return;
        if (!user || !token) {
            console.log('No user or token, redirecting to login');
            navigate('/login');
        } else {
            console.log('User authenticated:', user.phoneNumber, 'Token:', token);
        }
    }, [user, token, loading, navigate, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: '' }));
        if (name === 'startDate' || name === 'period') {
            updateEndDate({ ...formData, [name]: value });
        }
    };

    const updateEndDate = (updatedFormData) => {
        const startDate = new Date(updatedFormData.startDate);
        const period = updatedFormData.period;
        if (updatedFormData.startDate && !isNaN(startDate.getTime()) && period) {
            let endDate = new Date(startDate);
            if (period === 'MONTHLY') {
                endDate.setMonth(endDate.getMonth() + 1);
            } else if (period === 'YEARLY') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }
            setFormData((prev) => ({ ...prev, endDate: endDate.toISOString().split('T')[0] }));
        } else {
            setFormData((prev) => ({ ...prev, endDate: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Поле не может быть пустым';
        if (!formData.cost) newErrors.cost = 'Поле не может быть пустым';
        else if (parseFloat(formData.cost) < 0) newErrors.cost = 'Стоимость не может быть отрицательной';
        if (!formData.period) newErrors.period = 'Поле не может быть пустым';
        if (!formData.startDate) newErrors.startDate = 'Поле не может быть пустым';
        else if (isNaN(new Date(formData.startDate))) newErrors.startDate = 'Некорректная дата';
        if (!formData.endDate) newErrors.endDate = 'Поле не может быть пустым';
        else if (isNaN(new Date(formData.endDate))) newErrors.endDate = 'Некорректная дата';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            console.log('Client-side validation errors:', newErrors);
            return;
        }

        const payload = {
            name: formData.name.trim(),
            cost: parseFloat(formData.cost) || 0,
            period: formData.period,
            startDate: formData.startDate,
            endDate: formData.endDate || null
        };
        console.log('Sending subscription data:', {
            ...payload,
            token: token.substring(0, 20) + '...'
        });
        try {
            const response = await axios.post(
                'http://localhost:8080/api/subscription/add',
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                }
            );
            console.log('Add subscription response:', response.data);
            setMessage('Подписка успешно добавлена');
            setTimeout(() => {
                setMessage('');
                fetchSubscriptions(); // Обновляем список перед закрытием
                onClose(); // Закрываем модалку
            }, 3000);
        } catch (err) {
            console.error('Subscription error:', {
                status: err.response?.status,
                message: err.message,
                data: err.response?.data
            });
            const errorData = err.response?.data || { error: 'Ошибка добавления подписки' };
            console.log('Server error data:', errorData);
            setErrors({
                name: errorData.name || '',
                cost: errorData.cost || '',
                period: errorData.period || '',
                startDate: errorData.startDate || '',
                endDate: errorData.endDate || '',
                error: errorData.error || ''
            });
            setTimeout(() => setErrors({}), 3000);
        }
    };

    return (
        <div className="modal" style={{ display: 'flex' }} onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <span className="close-modal" onClick={onClose}>×</span>
                <div className="subscription-form" style={{ boxShadow: 'none', width: '100%', padding: '0', background: 'transparent' }}>
                    <h1>Добавить подписку</h1>
                    {message && <div className="success-message animate-in">{message}</div>}
                    {errors.error && <div className="form-error-block">{errors.error}</div>}
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="input-label">
                            {errors.name && <span className="form-error-tooltip">{errors.name}</span>}
                            <label>
                                Название:
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    aria-invalid={errors.name ? 'true' : 'false'}
                                />
                            </label>
                        </div>
                        <div className="input-label">
                            {errors.cost && <span className="form-error-tooltip">{errors.cost}</span>}
                            <label>
                                Стоимость:
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="cost"
                                    value={formData.cost}
                                    onChange={handleChange}
                                    aria-invalid={errors.cost ? 'true' : 'false'}
                                />
                            </label>
                        </div>
                        <div className="input-label">
                            {errors.period && <span className="form-error-tooltip">{errors.period}</span>}
                            <label>
                                Период:
                                <select
                                    name="period"
                                    value={formData.period}
                                    onChange={handleChange}
                                    aria-invalid={errors.period ? 'true' : 'false'}
                                >
                                    <option value="">Выберите период</option>
                                    <option value="MONTHLY">Ежемесячно</option>
                                    <option value="YEARLY">Ежегодно</option>
                                </select>
                            </label>
                        </div>
                        <div className="input-label">
                            {errors.startDate && <span className="form-error-tooltip">{errors.startDate}</span>}
                            <label>
                                Начало:
                                <input
                                    type="date"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    aria-invalid={errors.startDate ? 'true' : 'false'}
                                />
                            </label>
                        </div>
                        <div className="input-label">
                            {errors.endDate && <span className="form-error-tooltip">{errors.endDate}</span>}
                            <label>
                                Конец:
                                <input
                                    type="date"
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    aria-invalid={errors.endDate ? 'true' : 'false'}
                                />
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button type="submit" className="btn primary">Сохранить</button>
                            <button type="button" className="btn secondary" onClick={onClose}>Отмена</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddSubscriptionModal;
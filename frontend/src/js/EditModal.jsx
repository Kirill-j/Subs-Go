import React, { useState } from 'react';
import axios from 'axios';
import '../App.css';

const EditModal = ({ subscription, setEditModalOpen, token, setMessage, setError, fetchSubscriptions }) => {
    const [formData, setFormData] = useState({
        id: subscription?.id || '',
        name: subscription?.name || '',
        cost: subscription?.cost || '',
        period: subscription?.period || '',
        startDate: subscription?.startDate ? subscription.startDate.split('T')[0] : '',
        endDate: subscription?.endDate ? subscription.endDate.split('T')[0] : ''
    });
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        setErrors((prev) => ({ ...prev, [name]: '' }));
        if (name === 'startDate' || name === 'period') {
            updateEndDate({ ...formData, [name]: value });
        }
    };

    const updateEndDate = (updatedFormData) => {
        const startDate = new Date(updatedFormData.startDate);
        const period = updatedFormData.period;
        if (startDate && !isNaN(startDate.getTime()) && period) {
            let endDate = new Date(startDate);
            if (period === 'MONTHLY') {
                endDate.setMonth(endDate.getMonth() + 1);
            } else if (period === 'YEARLY') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }
            setFormData({ ...updatedFormData, endDate: endDate.toISOString().split('T')[0] });
        } else {
            setFormData({ ...updatedFormData, endDate: '' });
        }
    };

    const extendSubscription = () => {
        const { startDate, endDate, period } = formData;
        if (!startDate || !endDate || !period) {
            setError('Заполните даты начала, окончания и период');
            setTimeout(() => setError(''), 3000);
            return;
        }
        let newEndDate = new Date(endDate);
        if (period === 'MONTHLY') {
            newEndDate.setMonth(newEndDate.getMonth() + 1);
        } else if (period === 'YEARLY') {
            newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        }
        setFormData({ ...formData, endDate: newEndDate.toISOString().split('T')[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!formData.name) newErrors.name = 'Поле не может быть пустым';
        if (!formData.cost) newErrors.cost = 'Поле не может быть пустым';
        else if (parseFloat(formData.cost) < 0) newErrors.cost = 'Стоимость не может быть отрицательной';
        if (!formData.period) newErrors.period = 'Поле не может быть пустым';
        if (!formData.startDate) newErrors.startDate = 'Поле не может быть пустым';
        else if (isNaN(new Date(formData.startDate))) newErrors.startDate = 'Некорректная дата';
        if (!formData.endDate) newErrors.endDate = 'Поле не может быть пустым';
        else if (isNaN(new Date(formData.endDate))) newErrors.endDate = 'Некорректная дата';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            const response = await axios.put(`http://localhost:8080/api/subscription/edit/${formData.id}`, {
                name: formData.name,
                cost: parseFloat(formData.cost),
                period: formData.period,
                startDate: formData.startDate,
                endDate: formData.endDate
            }, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true
            });
            console.log('Edit subscription response:', response.data);
            fetchSubscriptions(); // Обновляем subscriptions и statistics с сервера
            setEditModalOpen(false);
            setMessage('Подписка успешно обновлена');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error('Subscription edit error:', {
                status: err.response?.status,
                message: err.message,
                data: err.response?.data
            });
            const errorData = err.response?.data || { error: 'Ошибка обновления подписки' };
            setErrors({
                name: errorData.name || '',
                cost: errorData.cost || '',
                period: errorData.period || '',
                startDate: errorData.startDate || '',
                endDate: errorData.endDate || '',
                error: errorData.error || ''
            });
            if (errorData.error) {
                setError(errorData.error);
                setTimeout(() => setError(''), 3000);
            }
        }
    };

    return (
        <div className="modal edit-subscription-modal" style={{ display: 'flex' }} onClick={() => setEditModalOpen(false)}>
            <div className="modal-content edit-subscription-form" onClick={(e) => e.stopPropagation()}>
                <span className="close-modal" onClick={() => setEditModalOpen(false)}>×</span>
                <form onSubmit={handleSubmit}>
                    <h1>Редактировать подписку</h1>
                    {errors.error && <div className="form-error-block">{errors.error}</div>}
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
                        <button type="button" onClick={extendSubscription} className="btn primary">Продлить</button>
                        <button type="button" onClick={() => setEditModalOpen(false)} className="btn secondary">Отмена</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditModal;
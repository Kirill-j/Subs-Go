import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from './js/AuthContext.jsx';
import Chart from 'chart.js/auto';
import './App.css';
import EditModal from './js/EditModal.jsx';
import AddSubscriptionModal from './js/AddSubscriptionModal.jsx';

const Home = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    // ИЗМЕНЕНО: Названия полей теперь соответствуют Go-бэкенду
    const [statistics, setStatistics] = useState({ monthlyCount: 0, yearlyCount: 0 });
    
    const [filters, setFilters] = useState({
        name: '',
        costMin: '',
        costMax: '',
        startDate: '',
        endDate: '',
        period: ''
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' });
    const { user, token, loading, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const chartRef = useRef(null);
    const chartMobileRef = useRef(null);

    useEffect(() => {
        if (loading) return;
        if (!user || !token) {
            navigate('/login');
            return;
        }
        fetchSubscriptions();
    }, [user, token, loading, navigate]);

    // Обновленная логика графиков
    useEffect(() => {
        // ИЗМЕНЕНО: Проверка новых ключей
        if (statistics.monthlyCount === 0 && statistics.yearlyCount === 0) {
            return;
        }

        const data = {
            labels: ['Ежемесячные', 'Ежегодные'],
            datasets: [{
                // ИЗМЕНЕНО: Данные из новых ключей
                data: [statistics.monthlyCount, statistics.yearlyCount],
                backgroundColor: ['#3b82f6', '#ef4444'],
                borderColor: ['#fff', '#fff'],
                borderWidth: 2
            }]
        };

        const config = {
            type: 'pie',
            data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 14, family: 'Inter' } } },
                }
            }
        };

        if (chartRef.current) {
            if (chartRef.current.chart) chartRef.current.chart.destroy();
            chartRef.current.chart = new Chart(chartRef.current, config);
        }

        if (chartMobileRef.current) {
            if (chartMobileRef.current.chart) chartMobileRef.current.chart.destroy();
            chartMobileRef.current.chart = new Chart(chartMobileRef.current, config);
        }

        return () => {
            if (chartRef.current?.chart) chartRef.current.chart.destroy();
            if (chartMobileRef.current?.chart) chartMobileRef.current.chart.destroy();
        };
    }, [statistics]);

    const fetchSubscriptions = async (applyFilters = false) => {
        if (!token) return;

        const params = applyFilters ? {
            name: filters.name || null,
            costMin: filters.costMin || null,
            costMax: filters.costMax || null,
            startDate: filters.startDate || null,
            endDate: filters.endDate || null,
            period: filters.period || null
        } : {};

        try {
            const response = await axios.get('http://localhost:8080/api/subscription', {
                headers: { 'Authorization': `Bearer ${token}` },
                params
            });
            
            // Go возвращает { subscriptions: [], statistics: {} }
            setSubscriptions(response.data.subscriptions || []);
            // ИЗМЕНЕНО: Установка статистики из ответа бэкенда
            setStatistics(response.data.statistics || { monthlyCount: 0, yearlyCount: 0 });
            setError('');
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Ошибка загрузки данных');
        }
    };

    // ... (остальные функции handleFilterChange, handleDelete и т.д. без изменений)

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        fetchSubscriptions(true);
    };

    const handleFilterReset = (e) => {
        e.preventDefault();
        setFilters({ name: '', costMin: '', costMax: '', startDate: '', endDate: '', period: '' });
        fetchSubscriptions();
    };

    const handleEditOpen = (subscription) => {
        setSelectedSubscription(subscription);
        setEditModalOpen(true);
    };

    const handleDeleteOpen = (id, name) => {
        setDeleteModal({ open: true, id, name });
    };

    const handleDeleteSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.delete(`http://localhost:8080/api/subscription/delete/${deleteModal.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMessage('Подписка удалена');
            setDeleteModal({ open: false, id: null, name: '' });
            fetchSubscriptions();
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError('Ошибка удаления');
        }
    };

    const formatDate = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <div className="container">
            {loading ? (
                <div>Загрузка...</div>
            ) : (
                <>
                    <div className="welcome-block">
                        <h1>Добро пожаловать, {user?.name}!</h1>
                        <div className="welcome-buttons">
                            <button onClick={() => navigate('/profile')} className="btn primary">Личный кабинет</button>
                            <button onClick={logout} className="btn secondary">Выйти</button>
                        </div>
                    </div>

                    {/* Мобильная статистика */}
                    <div className={`stats-block-mobile ${statistics.monthlyCount === 0 && statistics.yearlyCount === 0 ? 'empty' : ''}`}>
                        <h3>Статистика расходов</h3>
                        {statistics.monthlyCount === 0 && statistics.yearlyCount === 0 ? (
                            <div className="empty-message">Нет данных для отображения</div>
                        ) : (
                            <div className="chart-container-box">
                                <canvas ref={chartMobileRef}></canvas>
                            </div>
                        )}
                    </div>

                    <div className="page-container">
                        <div className="content-block">
                            <h2>Ваши подписки</h2>
                            {message && <div className="success-message">{message}</div>}
                            {error && <div className="error-message">{error}</div>}

                            {/* Форма фильтров */}
                            <form onSubmit={handleFilterSubmit} className="filter-form">
                                <div className="filter-group">
                                    <label>Название:</label>
                                    <input type="text" name="name" value={filters.name} onChange={handleFilterChange} placeholder="Введите название" />
                                </div>
                                <div className="filter-group cost-group">
                                    <label>Стоимость:</label>
                                    <div className="cost-range">
                                        <input type="number" name="costMin" value={filters.costMin} onChange={handleFilterChange} placeholder="0.00" />
                                        <span className="dash">–</span>
                                        <input type="number" name="costMax" value={filters.costMax} onChange={handleFilterChange} placeholder="100.00" />
                                    </div>
                                </div>
                                <div className="filter-group">
                                    <label>Период:</label>
                                    <select name="period" value={filters.period} onChange={handleFilterChange}>
                                        <option value="">Все</option>
                                        <option value="MONTHLY">Ежемесячно</option>
                                        <option value="YEARLY">Ежегодно</option>
                                    </select>
                                </div>
                                <div className="filter-buttons">
                                    <button type="submit" className="btn primary">Применить</button>
                                    <button type="button" onClick={handleFilterReset} className="btn secondary">Сбросить</button>
                                </div>
                            </form>

                            <table>
                                <thead>
                                    <tr>
                                        <th>Название</th>
                                        <th>Стоимость</th>
                                        <th>Начало</th>
                                        <th>Окончание</th>
                                        <th>Период</th>
                                        <th>Удалить</th>
                                        <th>Изменить</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subscriptions.map((sub) => (
                                        <tr key={sub.id}>
                                            <td>{sub.name}</td>
                                            <td>{parseFloat(sub.cost).toFixed(2)}</td>
                                            <td>{formatDate(sub.startDate)}</td>
                                            <td>{formatDate(sub.endDate)}</td>
                                            <td>{sub.period === 'MONTHLY' ? 'Ежемесячная' : 'Ежегодная'}</td>
                                            <td><button className="delete-button" onClick={() => handleDeleteOpen(sub.id, sub.name)}>Удалить</button></td>
                                            <td><button className="edit-button" onClick={() => handleEditOpen(sub)}>Изменить</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button onClick={() => setIsAddModalOpen(true)} className="btn primary" style={{marginTop: '1rem'}}>Добавить подписку</button>
                        </div>

                        {/* Десктопная статистика */}
                        <div className={`stats-block ${statistics.monthlyCount === 0 && statistics.yearlyCount === 0 ? 'empty' : ''}`}>
                            <h3>Статистика расходов</h3>
                            {statistics.monthlyCount === 0 && statistics.yearlyCount === 0 ? (
                                <div className="empty-message">Нет данных для отображения</div>
                            ) : (
                                <div className="chart-container-box">
                                    <canvas ref={chartRef}></canvas>
                                </div>
                            )}
                        </div>
                    </div>

                    {editModalOpen && (
                        <EditModal
                            subscription={selectedSubscription}
                            setEditModalOpen={setEditModalOpen}
                            token={token}
                            setMessage={setMessage}
                            setError={setError}
                            fetchSubscriptions={fetchSubscriptions}
                        />
                    )}

                    <AddSubscriptionModal 
                        isOpen={isAddModalOpen} 
                        onClose={() => setIsAddModalOpen(false)} 
                        token={token}
                        fetchSubscriptions={fetchSubscriptions}
                        setMessage={setMessage}
                    />

                    {deleteModal.open && (
                        <div className="modal-overlay">
                             <div className="modal-content">
                                <p>{`Вы уверены, что хотите удалить "${deleteModal.name}"?`}</p>
                                <form onSubmit={handleDeleteSubmit}>
                                    <button type="submit" className="delete-button">Удалить</button>
                                    <button type="button" className="btn secondary" onClick={() => setDeleteModal({ open: false, id: null, name: '' })}>Отмена</button>
                                </form>
                             </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Home;
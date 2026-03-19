import React from 'react';

const ProfileEditModal = ({ formData, setFormData, errors, setErrors, handleChange, handleSubmit, setIsModalOpen, token }) => {
    
    // Функция маски для номера телефона
    const onPhoneChange = (e) => {
        let value = e.target.value;
        
        // Очищаем всё, кроме цифр
        const input = value.replace(/\D/g, '');
        let formatted = '';

        if (input.length > 0) {
            formatted = '+7';
            
            // Если первая цифра 7 или 8 — игнорируем её, так как у нас уже есть +7
            const selection = (input[0] === '7' || input[0] === '8') ? input.substring(1) : input;
            
            // Форматируем по маске: +7XXX-XXX-XX-XX
            if (selection.length > 0) {
                formatted += selection.substring(0, 3);
            }
            if (selection.length >= 4) {
                formatted += '-' + selection.substring(3, 6);
            }
            if (selection.length >= 7) {
                formatted += '-' + selection.substring(6, 8);
            }
            if (selection.length >= 9) {
                formatted += '-' + selection.substring(8, 10);
            }
        } else {
            // Если пользователь удалил всё, оставляем поле пустым или +7
            formatted = '';
        }

        // Обновляем состояние формы напрямую
        setFormData(prev => ({ ...prev, phoneNumber: formatted }));
        
        // Очищаем ошибку поля при вводе
        if (errors.phoneNumber) {
            setErrors(prev => ({ ...prev, phoneNumber: '' }));
        }
    };

    const handleSubmitWrapper = async (e) => {
        e.preventDefault();
        await handleSubmit(e);
    };

    return (
        <div className="modal edit-profile-modal" style={{ display: 'flex' }} onClick={() => setIsModalOpen(false)}>
            <div className="modal-content edit-subscription-form" onClick={(e) => e.stopPropagation()}>
                <span className="close-modal" onClick={() => setIsModalOpen(false)}>×</span>
                <form onSubmit={handleSubmitWrapper}>
                    <h1>Редактировать профиль</h1>
                    
                    {errors.error && <div className="form-error-block">{errors.error}</div>}
                    
                    <div className="input-label">
                        {errors.name && <span className="form-error-tooltip">{errors.name}</span>}
                        <label>
                            Имя:
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
                        {errors.phoneNumber && <span className="form-error-tooltip">{errors.phoneNumber}</span>}
                        <label>
                            Телефон:
                            <input
                                type="text"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={onPhoneChange} // Используем новую функцию маски
                                placeholder="+7XXX-XXX-XX-XX"
                                aria-invalid={errors.phoneNumber ? 'true' : 'false'}
                            />
                        </label>
                    </div>

                    <div className="input-label">
                        {errors.password && <span className="form-error-tooltip">{errors.password}</span>}
                        <label>
                            Новый пароль (опционально):
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                aria-invalid={errors.password ? 'true' : 'false'}
                            />
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button type="submit" className="btn primary">Сохранить</button>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn secondary">Отмена</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileEditModal;
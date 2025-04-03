import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import '../styles/AuthScreen.css';
import Header from './Header.js';
import ConversationScreen from './ConversationScreen.js';

const AuthScreen = () => {
    const [selectedBranch, setSelectedBranch] = useState(''); 
    const navigate = useNavigate();

    const handleConfirm = () => {
        // lead to 對話頁面，傳遞 branch name
        navigate('/conversation', {state: {selectedBranch}});
    };

    return (
        <div className='auth-container'>
            <Header title='手語 / 語音辨識系統' />

            <select className='branch-dropdown' value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
                <option value="">請選擇分行</option>
                <option value="113 士林分行">113 台北士林分行</option>
                <option value="135 社子分行">135 台北社子分行</option>
                <option value="157 雅蘭分行">157 台北雅蘭分行</option>
                <option value="131 士東分行">131 台北士東分行</option>
                <option value="034 天母分行">034 台北天母分行</option>
                <option value="101 忠孝東路分行">101 台北忠孝東路分行</option>
                <option value="005 忠孝分行">005 台北忠孝分行</option>
                <option value="001 世貿分行">001 台北世貿分行</option>
                <option value="160 仁愛分行">160 台北仁愛分行</option>
                <option value="136 信義分行">136 台北信義分行</option>
            </select>

            <button 
                className={`confirm-button ${selectedBranch ? "active" : "disabled"}`}
                onClick={handleConfirm}
                disabled = {!selectedBranch}>
                確認 Confirm
            </button>
        </div>   
    );
}

export default AuthScreen;
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../styles/AuthScreen.css';

const AuthScreen = () => {
    const [selectedBranch, setSelectedBranch] = useState('');     

    return (
        <div className='auth-container'>
            <div className='header'>手語/語音辨識系統</div>

            <select className='branch-dropdown' value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
                <option value="">請選擇分行</option>
                <option value="士林分行">113 台北士林分行</option>
                <option value="社子分行">135 台北社子分行</option>
                <option value="雅蘭分行">157 台北雅蘭分行</option>
                <option value="士東分行">131 台北士東分行</option>
                <option value="天母分行">034 台北天母分行</option>
                <option value="忠孝東路分行">101 台北忠孝東路分行</option>
                <option value="忠孝分行">005 台北忠孝分行</option>
                <option value="世貿分行">001 台北世貿分行</option>
                <option value="仁愛分行">160 台北仁愛分行</option>
                <option value="信義分行">136 台北信義分行</option>
            </select>

            <button className={`confirm-button ${selectedBranch ? "active" : "disabled"}`} disabled = {!selectedBranch}>
                確認 Confirm
            </button>
        </div>   
    );
}

export default AuthScreen;
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Header.css';

const Header = ({ title, showBackButton = false, onBack }) => {
    const navigate = useNavigate();
    
    const handleBackClick = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1); // 默認行為：返回上一頁
        }
    };
    
    return (
        <div className="header">
            {showBackButton && (
                <button className="back-button" onClick={handleBackClick}>
                    <span className="back-arrow">&#8249;</span>
                </button>
            )}
            <h1 className="header-title">{title}</h1>
        </div>
    );
};

export default Header;
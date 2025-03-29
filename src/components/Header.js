import React from 'react';
import {useNavigate} from 'react-router-dom';
import '../styles/Header.css';

// 新增 title 作為 prop
const Header = ({ title = '手語 / 語音辨識系統' }) => {
    return (
        <div className="header">
            {title}
        </div>
    );
};

export default Header;
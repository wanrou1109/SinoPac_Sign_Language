import React from 'react';
import {useNavigate} from 'react-router-dom';
import '../styles/Feedback.css';

const Header = ({title = '使用回饋', showBackButton = true, onBack}) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if(onBack){
            onBack();
        }else{
            navigate(-1);
        }
    };

    return (
        <header className='header'>
            <div className='header-content'>
                {showBackButton && (
                    <button className='back-button' onClick={handleBack}>
                        <span className='back-icon'> ← </span>
                        返回
                    </button>
                )}

                <h1 className='header-title'>{title}</h1>
            </div>
        </header>
    );
};

export default Header;
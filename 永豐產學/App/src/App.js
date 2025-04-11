import React, {useState, useEffect} from 'react';
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom';
import AuthScreen from './components/AuthScreen.js';
import ConversationScreen from './components/ConversationScreen.js';
import FeedbackScreen from './components/FeedbackScreen.js';
import ScreenSaver from './components/ScreenSaver.js';
import SignLanguageRecognition from './components/SignLanguageRecognition.js';
import SpeechRecognition from './components/SpeechRecognition.js';
//import TextEditor from './components/TextEditor.js';
import ThankYouScreen from './components/ThankYouScreen.js';
import {AppProvider} from './contexts/AppContext.js';
import './App.js';

function App() {
    return (
        <div className='App'>
            <AppProvider>
            <Router>
                <div className='content'>
                    <Routes>
                        <Route path = '/' element = {<AuthScreen />} />
                        <Route path = '/screensaver' element = {<ScreenSaver />} />
                        <Route path = '/conversation' element = {<ConversationScreen />} />
                        <Route path = '/feedback' element = {<FeedbackScreen />} />
                        <Route path = '/sign-language-recognition' element = {<SignLanguageRecognition />} />
                        <Route path = '/speech-recognition' element = {<SpeechRecognition />} />
                        <Route path = '/thank-you' element = {<ThankYouScreen />} />
                        <Route path = '*' element = {<Navigate to = '/' replace />} />
                    </Routes>
                </div>
            </Router>
        </AppProvider>
        </div>
    );
}

export default App;
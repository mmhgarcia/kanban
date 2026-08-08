import React from 'react';
import { Board } from './components/Board/Board';
import { UpdatePrompt } from './components/UpdatePrompt/UpdatePrompt';
import './index.css';

const App: React.FC = () => {
  return (
    <div className="app">
      <Board />
      <UpdatePrompt />
    </div>
  );
};

export default App;

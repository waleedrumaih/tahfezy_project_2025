import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Home Page</h1>
      {/* Your home page content */}
    </div>
  );
}

export default Home; 
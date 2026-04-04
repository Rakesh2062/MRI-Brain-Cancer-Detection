import React from 'react';

const Card = ({ children, className = '' }) => {
  return (
    <div className={`bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
};

export default Card;

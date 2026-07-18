import React from 'react';

export const BlurBlob: React.FC = () => {
  return (
    <>
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-300/20 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-rose-200/25 blur-[150px] rounded-full pointer-events-none z-0" />
    </>
  );
};

// ./pages/DeadPage.jsx

import React from 'react';

const DeadPage = () => {
  return (
    <div className="fixed inset-0 bg-gray-900 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 text-white p-8 rounded-2xl shadow-2xl max-w-sm w-full animate-fadeInScale">
        <div className="mb-4 animate-float">
          <img
            src="https://preview.redd.it/rnj1si3kzwn51.png?width=720&format=png&auto=webp&s=6e7243bb5c2d8f27921313b0f8ef27617523d604"
            alt="Dead Icon"
            className="w-24 h-24 mx-auto"
          />
        </div>
        <h1 className="text-3xl font-bold text-red-500 mb-2 text-center">You Are Dead</h1>
        <p className="text-lg text-gray-300 text-center">rip bozo</p>
      </div>
    </div>
  );
};

export default DeadPage;

import React from "react";

interface DisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

const Disclaimer: React.FC<DisclaimerModalProps> = ({ isOpen, onAccept }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-lg w-full">
        <h2 className="text-xl font-bold mb-4">Disclaimer</h2>
        <p className="text-sm text-gray-700 mb-4">
          This application is provided <strong>as-is</strong>.  
          We are <strong>not responsible</strong> for any misuse, data leaks, or privacy breaches.  
          By continuing, you agree that you are solely responsible for protecting your own privacy and  
          you <strong>cannot hold us liable</strong> for any damages.
        </p>

        <div className="flex justify-end">
          <button
            onClick={onAccept}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;

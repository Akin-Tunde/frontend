// src/SkeletonReceipt.tsx

import React from 'react';

const SkeletonReceipt = () => {
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="p-6 bg-gray-700 rounded-lg shadow-lg font-mono animate-pulse">
        <div className="text-center">
          <div className="h-7 bg-gray-600 rounded w-3/4 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-600 rounded w-1/2 mx-auto mb-1"></div>
          <div className="h-4 bg-gray-600 rounded w-1/3 mx-auto"></div>
        </div>
        <div className="my-4 border-t border-b border-dashed border-gray-600 py-2">
          {/* Create a few placeholder list items */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center text-sm my-3 gap-3">
              <div className="w-10 h-10 bg-gray-600 rounded-full flex-shrink-0"></div>
              <div className="flex-grow">
                <div className="h-4 bg-gray-600 rounded w-5/6 mb-1"></div>
                <div className="h-3 bg-gray-600 rounded w-3/6"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <div className="h-3 bg-gray-600 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
      <div className="mt-8 p-6 bg-gray-800 rounded-lg">
        <div className="h-6 bg-gray-700 rounded w-1/2 mx-auto"></div>
      </div>
    </div>
  );
};

export default SkeletonReceipt;
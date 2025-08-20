import React from 'react';

export const NetworkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 100 18" opacity="0.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12a3 3 0 106 0 3 3 0 00-6 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9V3m0 18v-6m6-6h-6m-6 0h6" opacity="0.8" />
    <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" />
    <circle cx="12" cy="3" r="1.5" fill="currentColor" />
    <circle cx="12" cy="21" r="1.5" fill="currentColor" />
    <circle cx="3" cy="12" r="1.5" fill="currentColor" />
    <circle cx="21" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

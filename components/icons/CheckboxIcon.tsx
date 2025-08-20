import React from 'react';

export const CheckboxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l2.25 2.25 4.5-4.5m-6.75 2.25a9 9 0 1118 0 9 9 0 01-18 0z" clipRule="evenodd" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
    <rect x="4.5" y="4.5" width="15" height="15" rx="2" stroke="none" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 12.5l2 2 4-4" />
  </svg>
);

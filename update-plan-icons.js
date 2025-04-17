// Fix for Basic Plan
const basicPlanIcon = `<ul className="space-y-3 mb-8">
  <li className="flex items-start">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>5 therapy sessions/month</span>
  </li>
  <li className="flex items-start">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>30 minutes per session</span>
  </li>
  <li className="flex items-start">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>Basic relationship assessment</span>
  </li>
  <li className="flex items-start">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>Session transcripts</span>
  </li>
  <li className="flex items-start text-gray-400">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
    <span>Advanced relationship insights</span>
  </li>
</ul>`;

// Fix for Standard Plan
const standardPlanIcon = `<ul className="space-y-3 mb-8">
  <li className="flex items-start">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>10 therapy sessions/month</span>
  </li>
  <li className="flex items-start">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>60 minutes per session</span>
  </li>
  <li className="flex items-start">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>Comprehensive relationship assessment</span>
  </li>
  <li className="flex items-start">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>Session transcripts & summaries</span>
  </li>
  <li className="flex items-start">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>Advanced relationship insights</span>
  </li>
</ul>`;

// Fix for Premium Plan
const premiumPlanIcon = `<ul className="space-y-3 mb-8">
  <li className="flex items-start">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>Unlimited therapy sessions</span>
  </li>
  <li className="flex items-start">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>60 minutes per session</span>
  </li>
  <li className="flex items-start">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>Comprehensive relationship assessment</span>
  </li>
  <li className="flex items-start">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>Session transcripts & detailed insights</span>
  </li>
  <li className="flex items-start">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>Priority support & customized therapy options</span>
  </li>
</ul>`;

// Now, let's read the page.tsx file, update it, and write it back
const fs = require('fs');
const path = require('path');

const filePath = '/home/quadcode/workspace/github.com/Brian-Zavala/couple-therapy-website/src/app/page.tsx';

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Replace the first occurrence (Basic Plan)
const basicPlanRegex = /<ul className="space-y-3 mb-8">[\s\S]*?<\/ul>/;
content = content.replace(basicPlanRegex, basicPlanIcon);

// Replace the second occurrence (Standard Plan)
const standardPlanRegex = /<ul className="space-y-3 mb-8">[\s\S]*?<\/ul>/;
content = content.replace(standardPlanRegex, standardPlanIcon);

// Replace the third occurrence (Premium Plan)
const premiumPlanRegex = /<ul className="space-y-3 mb-8">[\s\S]*?<\/ul>/;
content = content.replace(premiumPlanRegex, premiumPlanIcon);

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');

console.log('Plan icons updated successfully!');
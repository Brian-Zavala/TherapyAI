'use client';

import React from 'react';
import { ImagesSlider, ImageConfig } from '@/components/ui/images-slider';

export function ImagesSliderExample() {
  // Example with dynamically sized images
  const images: (string | ImageConfig)[] = [
    // Simple string (default behavior - full size, object-cover)
    '/images/music/1.jpg',
    
    // Custom sized image with contain
    {
      src: '/images/music/2.jpg',
      width: '400px',
      height: '300px',
      objectFit: 'contain',
    },
    
    // Different aspect ratio
    {
      src: '/images/music/3.jpg',
      width: '80%',
      height: '60%',
      objectFit: 'cover',
      objectPosition: 'top center',
    },
    
    // Portrait orientation
    {
      src: '/images/music/4.jpg',
      width: '300px',
      height: '500px',
      objectFit: 'contain',
    },
    
    // Full width, custom height
    {
      src: '/images/music/5.jpg',
      width: '100%',
      height: '400px',
      objectFit: 'cover',
    },
  ];

  return (
    <div className="h-[40rem] relative">
      <ImagesSlider 
        images={images}
        className="h-full"
        overlay={true}
        autoplay={true}
        direction="up"
      >
        <div className="z-50 flex flex-col justify-center items-center absolute inset-x-0 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            Dynamic Image Slider
          </h1>
          <p className="text-xl text-white">
            Each image can have its own size and display properties
          </p>
        </div>
      </ImagesSlider>
    </div>
  );
}
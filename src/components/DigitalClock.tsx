'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';

interface ClockData {
  hours: string;
  minutes: string;
  seconds: string;
  ampm: string;
  day: string;
  month: string;
  date: number;
  year: number;
}

const DigitalClock = memo(() => {
  const [clockData, setClockData] = useState<ClockData>({
    hours: '',
    minutes: '',
    seconds: '',
    ampm: '',
    day: '',
    month: '',
    date: 0,
    year: 0
  });

  const updateClock = useCallback(() => {
    const now = new Date();
    
    const hour24 = now.getHours();
    const isAM = hour24 < 12;
    let hour12 = hour24;
    if (hour12 === 0) hour12 = 12; // Convert midnight (0) to 12
    if (hour12 > 12) hour12 -= 12; // Convert 13-23 to 1-11

    const monthList = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const dayList = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Single state update to prevent multiple re-renders
    setClockData({
      hours: hour12 < 10 ? '0' + hour12 : hour12.toString(),
      minutes: now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes().toString(),
      seconds: now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds().toString(),
      ampm: isAM ? 'AM' : 'PM',
      day: dayList[now.getDay()],
      month: monthList[now.getMonth()],
      date: now.getDate(),
      year: now.getFullYear()
    });
  }, []);

  useEffect(() => {
    // Initial update
    updateClock();

    // Set up interval
    const timer = setInterval(updateClock, 1000);

    return () => clearInterval(timer);
  }, [updateClock]);

  return (
    <div id="digitalClock" className="text-white text-center">
      <div className="flex items-baseline justify-center gap-1">
        <div className="text-3xl md:text-5xl font-light">
          <span>{clockData.hours}</span>
          <span className="mx-1 animate-pulse">:</span>
          <span>{clockData.minutes}</span>
          <span className="mx-1 animate-pulse">:</span>
          <span>{clockData.seconds}</span>
        </div>
        <div className="text-lg md:text-xl font-light ml-2 opacity-80">
          {clockData.ampm}
        </div>
      </div>
      <div className="text-xs md:text-sm uppercase tracking-wider opacity-70 mt-1">
        {clockData.day}, {clockData.month} {clockData.date}, {clockData.year}
      </div>
    </div>
  );
});

DigitalClock.displayName = 'DigitalClock';

export default DigitalClock;
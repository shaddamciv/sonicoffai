'use client';
import { useState } from 'react';

import { Trading } from '@/components/Trading';

export default function Home() {
  const [isStared, setIsStared] = useState(false);
  return (
    <main className='flex flex-col items-center justify-center gap-6 min-h-screen p-3'>
      {!isStared ?
        <>
          <h1>Welcome to Sonic CofFAI</h1>
          <p className='text-xl'>We help you trade based on latest news and provide interest!</p>
          <button className='btn btn-primary text-white' onClick={() => setIsStared(true)}>Get Started</button>
        </> :
        <Trading />
      }
    </main>
  );
}

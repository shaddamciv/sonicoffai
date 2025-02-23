import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import moment from 'moment';
import { QRCodeSVG } from 'qrcode.react';

import { Article, Decision, KeyInput } from '@/models/base';

export const Trading = () => {
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<KeyInput>({
    defaultValues: {
      provider: '',
      openAI: ''
    }
  });
  const [myAddress, setMyAddress] = useState<string>('');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [copyText, setCopyText] = useState<string>('Copy to clipboard');
  const [article, setArticle] = useState<Article>();
  const [decision, setDecision] = useState<Decision>();

  useEffect(() => {
    const address = localStorage.getItem('myAddress');
    if (address) {
      setMyAddress(address);
      setActiveStep(1);
    }
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(myAddress);
    setCopyText('Copied!');
    setTimeout(() => {
      setCopyText('Copy to clipboard');
    }, 1000);
  }

  const paste = async () => {
    const value = await window.navigator.clipboard.readText();
    setValue('openAI', value);
  }

  const onSubmitKey = async (data: KeyInput) => {
    if (data.provider === 'OpenAI') {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/agent/setenv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          OPENAI_API_KEY: data.openAI
        })
      });
      if (response.ok) {
        const json = await response.json();
        if (json && json.message) {
          setMyAddress(json.message);
          localStorage.setItem('myAddress', json.message);
          setActiveStep(1);
        }
      }
    }
  }

  const getLatestNews = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_NEWSAPI_BASE_URL}/everything?apikey=${process.env.NEXT_PUBLIC_NEWSAPI_API_KEY}&q=ethereum&searchIn=title,description,content&language=en&sortBy=publishedAt&pageSize=1&page=1`);
    if (response.ok) {
      const json = await response.json();
      if (json && json.articles && json.articles.length > 0) {
        const content = contentCleaner(json.articles[0].content);
        setArticle({
          ...json.articles[0],
          content
        });
        setActiveStep(2);
      }
    }
  }

  const contentCleaner = (content: string) => {
    const elm = document.createElement('div');
    elm.innerHTML = content;
    const result = elm.textContent || elm.innerText || '';
    return result.replace(/\n/g, ' ').replace(/\[.*?\s+chars\]/g, '').trim()
  }

  const analyse = async () => {
    const load = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/agents/news_analyzer/load`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    if (load.ok) {
      const json = await load.json();
      if (json && json.status === 'success') {
        const signal = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/agent/signal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            news: `title: ${article?.title}; description: ${article?.description}; content: ${article?.content}`
          })
        });
        if (signal.ok) {
          const signalJson = await signal.json();
          if (signalJson && signalJson.message && signalJson.message.result.length > 0) {
            const result = signalJson.message.result[0];
            const price = signalJson.message.price[0];
            setDecision({
              symbol: result.split(';')[0],
              type: result === 'POSITIVE' ? 'BUY' : 'SELL',
              price: +price.split(';')[1],
              timestamp: signalJson.message.timestamp
            });
            setActiveStep(3);
          }
        }
      }
    }
  }

  const start = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/agent/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    if (response.ok) {
      const json = await response.json();
      if (json && json.message) {
        console.log(json.message);
      }
    }
  }

  const stop = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/agent/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    if (response.ok) {
      const json = await response.json();
      if (json && json.message) {
        console.log(json.message);
      }
    }
  }

  return (
    <div className='flex flex-col items-center gap-4 w-full'>
      {activeStep === 0 &&
        <form className='flex flex-col items-center gap-4 w-full max-w-xl' onSubmit={handleSubmit(onSubmitKey)}>
          <h2>Setup Your Key</h2>
          <div className='flex flex-col items-start gap-1 w-full'>
            <span className='text-primary text-sm required'>Provider:</span>
            <Controller
              name='provider'
              control={control}
              rules={{
                required: { value: true, message: 'This field is required' }
              }}
              render={({ field }) =>
                <select {...field} className='select select-sm select-bordered rounded-sm w-full text-black'>
                  <option value='' disabled>Select</option>
                  <option value='OpenAI'>OpenAI</option>
                  <option value='Ollama' disabled>Ollama</option>
                </select>
              }
            />
            {errors.openAI && <span className='text-xs text-red-500'>{errors.openAI.message}</span>}
          </div>
          {
            watch('provider') === 'OpenAI' &&
            <div className='flex flex-col items-start gap-1 w-full'>
              <span className='text-primary text-sm required'>Enter OpenAI API key:</span>
              <Controller
                name='openAI'
                control={control}
                rules={{
                  required: { value: true, message: 'This field is required' }
                }}
                render={({ field }) =>
                  <label className='input input-primary input-bordered input-sm rounded-sm w-full text-black flex items-center gap-2'>
                    <input {...field} type='password' className='grow' placeholder='Enter OpenAI API key' />
                    <span className='text-primary text-xs uppercase font-semibold cursor-pointer' onClick={paste}>paste</span>
                  </label>
                }
              />
              {errors.provider && <span className='text-xs text-red-500'>{errors.provider.message}</span>}
            </div>
          }
          <button className='btn btn-primary btn-sm rounded-sm text-white min-w-60 uppercase' type='submit'>Confirm</button>
        </form>
      }

      {activeStep === 1 &&
        <div className='flex flex-col items-center gap-4 w-full max-w-xl'>
          <h2>Fund Your Wallet</h2>
          <QRCodeSVG value={`${myAddress}`} size={150} bgColor={'#ffffff'} />
          <label className='input input-primary input-bordered input-sm rounded-sm text-black flex items-center gap-2' style={{ maxWidth: 380, width: '100%' }}>
            <input type='text' className='grow' value={myAddress} disabled />
            <div className='tooltip' data-tip={copyText}>
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='size-4 cursor-pointer' onClick={copy}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z' />
              </svg>
            </div>
          </label>
          <button className='btn btn-primary btn-sm rounded-sm text-white min-w-60 uppercase' onClick={getLatestNews}>Confirm</button>
        </div>
      }

      {activeStep === 2 &&
        <div className='flex flex-col items-center gap-4 w-full max-w-xl'>
          <h2>Lastest news</h2>
          <div className='flex flex-col items-start gap-1 w-full'>
            <img src={article?.urlToImage} alt={article?.title} className='rounded-lg w-full' />
            <a className='text-lg text-primary font-semibold underline' href={article?.url} target='_blank'>{article?.title}</a>
            <p>{article?.content}</p>
          </div>
          <button className='btn btn-primary btn-sm rounded-sm text-white min-w-60 uppercase' onClick={analyse}>Analyse this new</button>
        </div>
      }

      {activeStep === 3 &&
        <div className='flex flex-col items-center gap-4 w-full max-w-xl'>
          <h2>Summary</h2>
          <table className='table border text-xs w-full shadow-sm rounded-none'>
            <thead>
              <tr>
                <th>Time</th>
                <th>Symbol</th>
                <th>Decision</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className='hover'>
                <td>{moment(decision?.timestamp).format('DD-MM-yyyy hh:mm:ss')}</td>
                <td>{decision?.symbol}</td>
                <td>{decision?.type}</td>
                <td>
                  <button className='btn btn-success btn-sm rounded-sm text-white mr-3' onClick={start}>Start</button>
                  <button className='btn btn-error btn-sm rounded-sm text-white' onClick={stop}>Stop</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      }
    </div>
  );
}
import { useEffect, useState } from 'react';
import { Controller, set, useForm } from 'react-hook-form';

import moment from 'moment';
import { QRCodeSVG } from 'qrcode.react';

import { Article, Decision, KeyInput } from '@/models/base';
import { Transactions } from './Transactions';

export const Trading = () => {
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<KeyInput>({
    defaultValues: {
      provider: 'OpenAI',
      openAI: ''
    }
  });
  const [myAddress, setMyAddress] = useState<string>('');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [copyText, setCopyText] = useState<string>('Copy to clipboard');
  const [article, setArticle] = useState<Article>();
  const [decision, setDecision] = useState<Decision>();
  const [isLoading, setIsLoading] = useState<boolean>();
  const [isAnalysing, setIsAnalysing] = useState<boolean>();
  const [myContent, setMyContent] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>();

  useEffect(() => {
    const at = localStorage.getItem('activeStep');
    if (at) {
      setActiveStep(+at);
      if (+at === 2) {
        getLatestNews();
      } else if (+at === 3) {
        const deci = localStorage.getItem('decision');
        if (deci) {
          setDecision(JSON.parse(deci) as Decision);
          getAgentStatus();
        }
      }
    }
  }, []);

  useEffect(() => {
    if (activeStep) {
      localStorage.setItem('activeStep', activeStep.toString());
    }
  }, [activeStep]);

  useEffect(() => {
    const address = localStorage.getItem('myAddress');
    if (address) {
      setMyAddress(address);
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
    setIsLoading(true);
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
    setIsLoading(false);
  }

  const getLatestNews = async () => {
    setIsLoading(true);
    const response = await fetch(`${process.env.NEXT_PUBLIC_NEWSAPI_BASE_URL}/everything?apikey=${process.env.NEXT_PUBLIC_NEWSAPI_API_KEY}&q=ethereum&searchIn=title&language=en&sortBy=publishedAt&pageSize=1&page=1`);
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
    setIsLoading(false);
  }

  const contentCleaner = (content: string) => {
    const elm = document.createElement('div');
    elm.innerHTML = content;
    const result = elm.textContent || elm.innerText || '';
    return result.replace(/\n/g, ' ').replace(/\[.*?\s+chars\]/g, '').trim()
  }

  const analyse = async () => {
    setIsAnalysing(true);
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
            news: myContent ? contentCleaner(myContent) : `title: ${article?.title}; description: ${article?.description}; content: ${article?.content}`
          })
        });
        if (signal.ok) {
          const signalJson = await signal.json();
          if (signalJson && signalJson.message && signalJson.message.result && signalJson.message.result.length > 0) {
            const result = signalJson.message.result[0];
            const price = signalJson.message.price[0];
            const deci = {
              symbol: result.split(';')[0],
              type: result.split(';')[1] === 'LONG' ? 'BUY' : 'SELL',
              rsi: +result.split(';')[2].replace('rsi ', ''),
              price: +price.split(';')[1],
              timestamp: signalJson.message.timestamp
            }
            setDecision(deci as Decision);
            localStorage.setItem('decision', JSON.stringify(deci));
            setActiveStep(3);
          }
        }
      }
    }
    setIsAnalysing(false);
  }

  const start = async () => {
    setIsLoading(true);
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/agent/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    if (response.ok) {
      getAgentStatus();
    }
    setIsLoading(false);
  }

  const stop = async () => {
    setIsLoading(true);
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/agent/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    if (response.ok) {
      getAgentStatus();
    }
    setIsLoading(false);
  }

  const getAgentStatus = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      const json = await response.json();
      setIsRunning(json && json.agent_running);
    }
  }

  return (
    <div className='flex flex-col items-center gap-4 w-full'>
      {activeStep === 0 &&
        <form className='flex flex-col items-center gap-4 w-full max-w-2xl' onSubmit={handleSubmit(onSubmitKey)}>
          <h2>Setup Your OpenAI Key</h2>
          {/* <div className='flex flex-col items-start gap-1 w-full'>
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
          </div> */}
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
          <button className='btn btn-primary btn-sm rounded-sm text-white min-w-60 uppercase' type='submit' disabled={isLoading}>
            {isLoading && <span className="loading loading-spinner text-white"></span>}
            Confirm
          </button>
        </form>
      }

      {activeStep === 1 &&
        <div className='flex flex-col items-center gap-4 w-full max-w-2xl'>
          <h2>Fund Your Wallet</h2>
          <QRCodeSVG value={`${myAddress}`} size={150} bgColor={'#ffffff'} />
          <label className='input input-primary input-bordered input-sm rounded-sm text-black flex items-center gap-2' style={{ maxWidth: 400, width: '100%' }}>
            <input type='text' className='grow' value={myAddress} disabled />
            <div className='tooltip tooltip-success' data-tip={copyText}>
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='size-4 cursor-pointer' onClick={copy}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z' />
              </svg>
            </div>
          </label>
          <button className='btn btn-primary btn-sm rounded-sm text-white min-w-60 uppercase' onClick={getLatestNews} disabled={isLoading}>
            {isLoading && <span className="loading loading-spinner text-white"></span>}
            Confirm
          </button>
        </div>
      }

      {activeStep === 2 &&
        <div className='flex flex-col items-center gap-4 w-full max-w-2xl'>
          <h2>Lastest news</h2>
          {isLoading ?
            <div className='flex flex-col items-center gap-2'>
              <span className="loading loading-spinner loading-lg"></span>
              <span className='text-success'>Getting latest news</span>
            </div> :
            <div className='flex flex-col items-start gap-1 w-full'>
              <img src={article?.urlToImage} alt={article?.title} className='rounded-lg w-full' />
              <a className='text-lg text-primary font-semibold underline' href={article?.url} target='_blank'>{article?.title}</a>
              <p>{article?.content}</p>
            </div>
          }
          <div className='flex flex-col items-start gap-1 w-full'>
            <span className='text-primary text-sm'>Or enter your content (optional):</span>
            <textarea className='textarea textarea-bordered rounded-sm text-black w-full' placeholder='Type a message' rows={3} value={myContent} onChange={(e) => {
              setMyContent(e.target.value);
            }}></textarea>
          </div>
          <button className='btn btn-primary btn-sm rounded-sm text-white min-w-60 uppercase' onClick={analyse} disabled={isAnalysing}>
            {isAnalysing && <span className="loading loading-spinner text-white"></span>}
            Analyse
          </button>
        </div>
      }

      {activeStep === 3 &&
        <div className='flex flex-col items-center gap-4 w-full max-w-2xl'>
          <h2>Summary</h2>
          <table className='table border text-xs w-full shadow-sm rounded-none'>
            <thead>
              <tr>
                <th>Time</th>
                <th>Symbol</th>
                <th>Price</th>
                <th>Decision</th>
                <th>
                  RSI
                  <div className='tooltip tooltip-success' data-tip='RSI: The 1D chart’s Relative Strength Index (RSI) is calculated over a 14-day period. It is a technical analysis tool that measures the speed and magnitude of a security’s recent price changes to detect overbought or oversold conditions. Typically, an RSI of 70 or higher indicates an overbought condition, while an RSI of 30 or lower indicates an oversold condition.'>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-error ml-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className='hover'>
                <td>{moment(decision?.timestamp).format('DD-MM-yyyy hh:mm:ss')}</td>
                <td>{decision?.symbol}</td>
                <td>{decision?.price}</td>
                <td className={`font-semibold ${decision?.type === 'SELL' ? 'text-error' : 'text-success'}`}>{decision?.type}</td>
                <td>{decision?.rsi}</td>
              </tr>
            </tbody>
          </table>
          {isRunning ?
            <div className='flex flex-col items-center gap-2'>
              <span className="loading loading-dots loading-sm"></span>
              <span className='text-success'>Your are trading</span>
              <button className='btn btn-error btn-sm rounded-sm text-white min-w-60 uppercase' onClick={stop} disabled={isLoading}>
                {isLoading && <span className="loading loading-spinner text-white"></span>}
                Stop trading
              </button>
            </div> :
            <>
              {(decision?.type === 'BUY' || decision?.type === 'SELL') &&
                <button className={`btn ${decision?.type === 'BUY' ? 'btn-success' : 'btn-error'} btn-sm rounded-sm text-white min-w-60 uppercase`} onClick={start} disabled={isLoading}>
                  {isLoading && <span className="loading loading-spinner text-white"></span>}
                  {decision?.type} {decision?.symbol}
                </button>
              }
            </>
          }
          {!isRunning && !isAnalysing &&
            <button className='btn btn-primary btn-sm rounded-sm text-white min-w-60 uppercase' onClick={() => {
              setActiveStep(2);
              localStorage.removeItem('decision');
              getLatestNews();
            }}>
              Go back
            </button>
          }
          <Transactions address={myAddress} />
        </div>
      }
    </div>
  );
}
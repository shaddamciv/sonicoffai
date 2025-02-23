import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import moment from 'moment';
import { QRCodeSVG } from 'qrcode.react';

import { KeyInput } from '@/models/base';

export const Trading = () => {
  const { control, handleSubmit, formState: { errors } } = useForm<KeyInput>({
    defaultValues: {
      openAI: '',
      allora: ''
    }
  });
  const [myAddress, setMyAddress] = useState<string>('0x1282401445452436b4094E86619B2Fd2fAD464d8')

  const onSubmit = (data: KeyInput) => {
    console.log(data);
  }

  return (
    <div className='flex flex-col items-center gap-4 w-full'>
      <form className='flex flex-col items-center gap-4 w-full max-w-xl' onSubmit={handleSubmit(onSubmit)}>
        <h2>Enter Your Key</h2>
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
                <span className='text-primary text-xs uppercase font-semibold cursor-pointer'>paste</span>
              </label>
            }
          />
          {errors.openAI && <span className='text-xs text-red-500'>{errors.openAI.message}</span>}
        </div>
        <div className='flex flex-col items-start gap-1 w-full'>
          <span className='text-primary text-sm required'>Enter Allora API key:</span>
          <Controller
            name='allora'
            control={control}
            rules={{
              required: { value: true, message: 'This field is required' }
            }}
            render={({ field }) =>
              <label className='input input-primary input-bordered input-sm rounded-sm w-full text-black flex items-center gap-2'>
                <input {...field} type='password' className='grow' placeholder='Enter Allora API key' />
                <span className='text-primary text-xs uppercase font-semibold cursor-pointer'>paste</span>
              </label>
            }
          />
          {errors.allora && <span className='text-xs text-red-500'>{errors.allora.message}</span>}
        </div>
        <button className='btn btn-primary btn-sm rounded-sm text-white min-w-60 uppercase' type='submit'>Confirm</button>
      </form>

      <div className='flex flex-col items-center gap-4 w-full max-w-xl'>
        <h2>Fund Your Wallet</h2>
        <QRCodeSVG value={`${myAddress}`} size={150} bgColor={'#ffffff'} />
        <label className='input input-primary input-bordered input-sm rounded-sm text-black flex items-center gap-2' style={{ maxWidth: 380, width: '100%' }}>
          <input type='text' className='grow' value={myAddress} disabled />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 cursor-pointer">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z" />
          </svg>
        </label>
        <button className='btn btn-primary btn-sm rounded-sm text-white min-w-60 uppercase' type='submit'>Confirm</button>
      </div>

      <div className='flex flex-col items-center gap-4 w-full max-w-xl'>
        <h2>Enter news</h2>
        <textarea className='textarea textarea-bordered rounded-sm text-black w-full' placeholder='Type a message' rows={3}></textarea>
        <button className='btn btn-primary btn-sm rounded-sm text-white min-w-60 uppercase' type='submit'>Confirm</button>
      </div>

      <div className='flex flex-col items-center gap-4 w-full max-w-xl'>
        <h2>Summary</h2>
        <table className='table border text-xs w-full shadow-sm rounded-none'>
          <thead>
            <tr>
              <th>Time</th>
              <th>Result</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className='hover'>
              <td>{moment().format('DD-MM-yyyy hh:mm:ss')}</td>
              <td>ETH - SHORT</td>
              <td>
                <button className='btn btn-success btn-sm rounded-sm text-white mr-3'>Approve</button>
                <button className='btn btn-error btn-sm rounded-sm text-white'>Reject</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
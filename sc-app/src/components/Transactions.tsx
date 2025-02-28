import { Transaction } from '@/models/base';
import { useEffect, useState } from 'react';

import { ethers } from 'ethers';
import moment from 'moment';
import Link from 'next/link';

export const formatNumber = (value: any, minimumFractionDigits: number = 0, maximumFractionDigits: number = 8) => {
  const numberFormatter = Intl.NumberFormat('en', { minimumFractionDigits, maximumFractionDigits });
  return numberFormatter.format(value);
}

export const shorterAddress = (str: string | null | undefined) => str && str.length > 8 ? str.slice(0, 6) + '...' + str.slice(-4) : str;

export const Transactions = (props: {
  address: string;
}) => {
  const [transactions, setTransactions] = useState<Array<Transaction>>([]);

  useEffect(() => {
    setInterval(() => {
      getTransactionRows();
    }
      , 3000);
  }, []);

  const getTransactionRows = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SONIC_SCAN_BASE_URL}?module=account&action=txlist&startblock=0&endblock=99999999&sort=desc&apikey=${process.env.NEXT_PUBLIC_SONIC_SCAN_API_KEY}&address=${props.address}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.result && Array.isArray(data.result))
          setTransactions(data.result);
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className='flex flex-col items-center gap-4 w-full mt-8'>
      <h2>Transaction history</h2>
      <table className='table border text-xs w-full shadow-sm rounded-none'>
        <thead>
          <tr>
            <th>Time</th>
            <th>TX Hash</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction, index) => (
            <tr key={index} className='hover'>
              <td>{moment(+transaction.timeStamp * 1000).format('DD-MM-yyyy hh:mm:ss')}</td>
              <td>
                <Link href={`https://sonicscan.org/tx/${transaction.hash}`} target='_blank' className='text-primary underline'>
                  {shorterAddress(transaction.hash)}
                </Link>
              </td>
              <td>{formatNumber(ethers.formatEther(transaction.value))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

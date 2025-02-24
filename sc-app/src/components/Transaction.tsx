import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Define the structure of a transaction object from Etherscan
interface Transaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  contractAddress: string;
  input: string;
  methodId: string;
  functionName: string;
}

// Define the props for the component
interface EtherscanAddressTransactionsProps {
  apiKey: string;
  address: string;
}

const EtherscanAddressTransactions: React.FC<EtherscanAddressTransactionsProps> = ({ apiKey, address }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // Etherscan API endpoint for getting transactions for an address
        const apiUrl = `https://api.sonicscan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;

        // Fetch transactions
        const response = await axios.get<{ result: Transaction[] }>(apiUrl);

        // Check if the response contains transactions
        if (response.data.result && response.data.result.length > 0) {
          setTransactions(response.data.result);
        } else {
          setError('No transactions found for this address.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [apiKey, address]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Latest Transactions for Address: {address}</h2>
      {transactions.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Transaction Hash</th>
              <th>From</th>
              <th>To</th>
              <th>Value (Wei)</th>
              <th>Timestamp</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.hash}>
                <td>
                  <a
                    href={`https://sonicscan.org/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {tx.hash}
                  </a>
                </td>
                <td>{tx.from}</td>
                <td>{tx.to}</td>
                <td>{tx.value}</td>
                <td>{new Date(parseInt(tx.timeStamp) * 1000).toLocaleString()}</td>
                <td>{tx.isError === '0' ? 'Success' : 'Failed'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No transactions found.</p>
      )}
    </div>
  );
};

export default EtherscanAddressTransactions;
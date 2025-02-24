export interface KeyInput {
  provider: string;
  openAI: string;
}

export interface Article {
  title: string;
  description: string;
  content: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
}

export interface Decision {
  symbol: string;
  type: 'SELL' | 'BUY' | 'NEUTRAL';
  price: number;
  timestamp: string;
  rsi: number;
}

export interface Transaction {
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

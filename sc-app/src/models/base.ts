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
  type: 'SELL' | 'BUY';
  price: number;
  timestamp: string;
  rsi: number;
}

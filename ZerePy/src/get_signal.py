import os
import logging
import requests
import pandas as pd
from datetime import datetime
from langchain_ollama import OllamaEmbeddings
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from .database import create_connection, insert_result, create_table

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger("cli")

def get_signal(message, agent):
    vector_db_path = os.path.join(os.getcwd(),'vector_db')
    if str(agent.model_provider)=='ollama':
        persistent_directory = os.path.join(vector_db_path,'chroma_ollama_db')
        embeddings = OllamaEmbeddings(model="gemma2:2b")
        print('yes')
    elif str(agent.model_provider)=='openai':
        persistent_directory = os.path.join(vector_db_path,'chroma_openai_db')
        embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small"
        )
    
    db = Chroma(persist_directory=persistent_directory,
            embedding_function=embeddings)
    retriever = db.as_retriever(search_type="similarity", search_kwargs={"k": 3})
    relevant_docs = retriever.invoke(message)
    if len(relevant_docs)>0:
        temp = "Here are some documents that might help answer the question: "
        for rel_doc in relevant_docs:
            temp += rel_doc.page_content
        temp += "Please help me analyze this New data: "
        message_input = temp + message
    else:
        message_input = message
    response = agent.prompt_llm(message_input)
    agent_response =response.replace(" ", "")
    agent_response =agent_response.replace("$", "")
    agent_response = agent_response.upper()
    response_list = agent_response.split("\n")
    print("Agent Response - ", agent_response)
    result = {
        "message": message,
        "timestamp": datetime.now(),
        "agent": response,
        "price": [],
        "result": []
    }

    conn = create_connection("results.db")
    create_table(conn)
    check_coins =[]
    for r in response_list:
        parts = r.split(";")
        if len(parts) == 2:
            symbol, sentiment = parts
        else:
            symbol, sentiment = parts[0], None
        symbol = str(symbol)
        sentiment = str(sentiment)
        print(symbol, sentiment)
        if sentiment in ["POSITIVE", "NEGATIVE", "NEUTRAL"]:
            symbol_list = symbol.split(",")
            for coin in symbol_list:
                url = f"https://api.binance.com/api/v3/klines?symbol={coin}USDT&interval=1d&limit=30"
                price_response = requests.get(url)
                if price_response.status_code == 200:
                    data = price_response.json()
                    df = pd.DataFrame(data, columns=[
                                    "timestamp", "open", "high", "low", "close", "volume", 
                                    "close_time", "quote_asset_volume", "trades", "taker_base_volume", 
                                    "taker_quote_volume", "ignore"
                                ])
                    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
                    df = df[["timestamp", "open", "high", "low", "close", "volume"]]
                    df[["open", "high", "low", "close", "volume"]] = df[["open", "high", "low", "close", "volume"]].astype(float)
                    df = __calculate_rsi(df)
                    price =  df['close'].iloc[-1]
                    rsi = round(df['rsi'].iloc[-1],1)
                    if coin in check_coins:
                        continue
                    if sentiment=="POSITIVE":
                        result_text = f"{coin};LONG;rsi {rsi}"
                        result['result'].append(result_text)
                        insert_result(conn, (coin, "LONG", rsi, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
                    if sentiment=="NEGATIVE":
                        result_text = f"{coin};SHORT;rsi {rsi}"
                        result['result'].append(result_text)
                        insert_result(conn, (coin, "SHORT", rsi, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
                    result['price'].append(f"{coin};{price}")
                    check_coins.append(coin)
    logger.info(f"\n{agent.name}: {response}")
    # we need to set like ETH - SHORT into DB, this will be picked up by loop and swap will be done
    return result

def __calculate_rsi(df, period=14):
    df["price_change"] = df["close"].diff()
    df["gain"] = df["price_change"].apply(lambda x: x if x > 0 else 0)
    df["loss"] = df["price_change"].apply(lambda x: -x if x < 0 else 0)
    df["avg_gain"] = df["gain"].rolling(window=period, min_periods=1).mean()
    df["avg_loss"] = df["loss"].rolling(window=period, min_periods=1).mean()
    df["rs"] = df["avg_gain"] / df["avg_loss"]
    df["rsi"] = 100 - (100 / (1 + df["rs"]))

    return df
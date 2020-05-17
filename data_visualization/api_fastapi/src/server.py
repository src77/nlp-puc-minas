# -*- coding: utf-8 -*-
from fastapi import FastAPI, HTTPException, Body
from starlette.responses import RedirectResponse, Response
from starlette.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from unidecode import unidecode
from typing import List, Dict
from pydantic import BaseModel, Field
from gensim.models import KeyedVectors as word2vec
from xgboost import XGBClassifier as XGBC
import json
from glob import glob
import numpy as np
import pandas as pd
import os
import re
import time
import functools

#Local modules
import regex
import ngrams
import word_freq
import docs

dot_ = '.' if os.path.exists('./input') else '..'

stop_words_lite = dict.fromkeys(list(pd.read_csv(dot_+'/input/stop_words_.txt', names=['stop']).stop), 1)
stop_words_full = set(pd.read_csv(dot_+'/input/stop_words.txt', sep="\n", names=['stop']).stop) | set(pd.read_csv(dot_+'/input/stop_words_.txt', names=['stop']).stop)
stop_words_full = dict.fromkeys(stop_words_full, 1)

key_words = pd.read_csv(dot_+'/input/key_words.csv')
key_words = dict(zip(key_words.key.values, key_words.value.values))
key_words_bi = pd.read_csv(dot_+'/input/key_words_bi_gram.csv')
key_words_bi = dict(zip(key_words_bi.key.values, key_words_bi.value.values))

# Load most recent w2v model
w2v_name_latest = glob(dot_+'/models/w2v/vectors.kv')[0]
w2v_model = word2vec.load(w2v_name_latest)
# To make the model memory efficient
w2v_model.init_sims(replace=True)

# List xgboost sentiment model
xgb_model_analyze = sorted(glob(dot_+'/models/analyze/*'),reverse=True)[0]


def rename_wrong_words(sentences, wrong_worgs=regex.WRONG_WORDS):
    sentences = sentences.replace(to_replace=wrong_worgs, regex=True)
    return sentences

def remove_stop_words(sentence, stop_words=stop_words_lite):
    stop = []
    if type(sentence) != list:
        return []
    for word in sentence:
        if not stop_words.get(word):
            stop.append(word)
    return stop

def join_words(words):
    if type(words) == list:
        return ' '.join(words)
    return ''

def text_normalizer(sentences, num_to_word=regex.NUM_TO_WORD, regex_dic=regex.REGEX_DIC):
    sentences = sentences.apply(unidecode)
    sentences = sentences.replace(to_replace=num_to_word, regex=True)
    sentences = sentences.replace(to_replace=regex_dic, regex=True)
    return sentences

def clean_text(sentences):
    sentences = sentences.apply(lambda s: str(s).lower())
    sentences = text_normalizer(sentences)
    sentences = rename_wrong_words(sentences)
    sentences = sentences.str.findall(r'[a-z]+|[\?!,]')
    return sentences

def get_regex_bad():
    bad = set(pd.read_csv(dot_+'/input/bad.csv', names=['words']).words)
    reg = '\\bcu\\b'
    for value in bad:
        reg += '|\\b' + value
    return reg

reg_bad = get_regex_bad()
def pre_classifier(sentence):
    quant = len(re.findall(reg_bad, sentence))
    return quant
   

def get_key_words(sentence):
    my_dict = {}
    sentence = sentence.split()
    for word in sentence:
        if key_words.get(word):
            if my_dict.get(key_words[word]):
                my_dict[key_words[word]] += 1
            else:
                my_dict[key_words[word]] = 1
    
    #Search for bi-grams
    if len(sentence) > 1:
        for i, word in enumerate(sentence):
            if i == len(sentence) - 1:
                break
            bigram = str(word) + ' ' + str(sentence[i+1])
            if key_words_bi.get(bigram):
                if my_dict.get(key_words_bi[bigram]):
                    my_dict[key_words_bi[bigram]] += 1
                else:
                    my_dict[key_words_bi[bigram]] = 1

    return my_dict


# Function to average all word vectors in a paragraph
def featureVecMethod(sentence, model, num_features):
    # Pre-initialising empty numpy array for speed
    featureVec = np.zeros(num_features, dtype="float32")
    vec_checksum = np.zeros(num_features, dtype="float32")
    nwords = 0

    for i, word in enumerate(sentence):
        try:
            vec = model.wv[word]
            nwords = nwords + 1
            featureVec = np.add(featureVec, vec)
            vec_sum = np.multiply(vec, i+1)
            vec_checksum = np.add(vec_checksum, vec_sum)
        except:
            pass

    # Dividing the result by number of words to get average
    if nwords > 0:
        featureVec = np.divide(featureVec, nwords)

    # Words in different order in sentence get different vectors
    vec_checksum = np.sum(vec_checksum)
    featureVec = np.append(featureVec, vec_checksum)
    return featureVec

# Function for calculating the average feature vector
def getAvgFeatureVecs(sentences, model, num_features=300):
    reviewFeatureVecs = np.zeros((len(sentences), num_features+1), dtype="float32")
    for i, sentence in enumerate(sentences):
        reviewFeatureVecs[i] = featureVecMethod(sentence, model, num_features)
    return reviewFeatureVecs


def transform(sentences, w2v_model, num_features=300, has_key_words=True, bad=True, stop_full=False):
    sentences = clean_text(sentences)        
    if stop_full:
        sentences = sentences.apply(lambda s: remove_stop_words(s, stop_words=stop_words_full))
    else:
        sentences = sentences.apply(lambda s: remove_stop_words(s))

    col_names = ['c'+str(i+1) for i in range(0, num_features+1)]
    vecs = pd.DataFrame(getAvgFeatureVecs(sentences, w2v_model, num_features), columns=col_names)
    sentences = sentences.str.join(' ')
    pre = pd.DataFrame()
    if has_key_words:
        pre['key_words'] = sentences.apply(get_key_words)
    if bad:
        pre['bad'] = sentences.apply(pre_classifier)
    vecs = pd.concat([pre, vecs], axis=1)
    return vecs


def predict(vecs, w2v_model, xgb_model, num_features=300):
    score = xgb_model.predict(vecs)
    return score


def predict_sent(vecs, xgb_model_analyze):
    xgb = XGBC()
    xgb.load_model(xgb_model_analyze)
    pred = predict(vecs, w2v_model, xgb, 300)
    df = pd.DataFrame(pred, columns=['sent'])
    return df


def predict_all(sentences, w2v_model, xgb_models_analyze):
    vecs_sent = transform(pd.Series(sentences), w2v_model, num_features=300, has_key_words=True, bad=True)
    keys = pd.DataFrame(columns=['key_words'])
    keys.key_words = vecs_sent.key_words
    del vecs_sent['key_words']
    sent = predict_sent(vecs_sent, xgb_models_analyze)
    txt = pd.DataFrame({'texto': pd.Series(sentences)})
    return pd.concat([txt, sent, keys], axis=1)


class Request(BaseModel):
    id: int = None
    sentences: List[str] = []
    ngram: int = None


class ResponseAll(BaseModel):
    result: List[dict] = Body(...,example=docs.responseExampleAll)
    id: int = None

class ResponseSent(BaseModel):
    result: List[dict] = Body(...,example=docs.responseExampleSent)
    id: int = None

class ResponseKeys(BaseModel):
    result: List[dict] = Body(...,example=docs.responseExampleKeys)
    id: int = None

class ResponseWordFreq(BaseModel):
    result: Dict = Body(...,example=docs.responseExampleWordFreq)
    id: int = None

class ResponseNgrams(BaseModel):
    result: Dict = Body(...,example=docs.responseExampleNgrams)
    id: int = None

app = FastAPI(
    title="API de Análise de Comentários",
    version="1.0.0",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

def validate_request(item):
    if not hasattr(item, 'sentences'):
        raise HTTPException(status_code=400, detail="Requisição em formato inválido!")
    elif type(item.sentences) != list:
        raise HTTPException(status_code=400, detail="Requisição em formato inválido!")
    elif len(item.sentences) == 0:
        raise HTTPException(status_code=400, detail="Requisição em formato inválido!")

@app.post('/v1/all', summary="Análise de sentimento e extração de palavras-chave", response_model=ResponseAll)
def all_sentences(req: Request = Body(...,example=docs.requestExample)):
    inicio = time.time()
    validate_request(req)
    sentences = pd.Series(req.sentences)
    preds = predict_all(sentences, w2v_model, xgb_model_analyze)
    res_json = preds.to_dict(orient='records')
    # import json
    # with open('data.json', 'w') as fp:
    #     json.dump(res_json, fp)
    response = {}
    response['result'] = res_json    
    if req.id != None:
        response['id'] = req.id
    result = jsonable_encoder(response)
    print('\nProcesso "ALL" finalizado em:', format(time.time()-inicio, '.2f'), 'seg.\n')
    return result

@app.post('/v1/analyze', summary="Analise de sentimento", response_model=ResponseSent)
def analyze_sentences(req: Request = Body(...,example=docs.requestExample)):
    inicio = time.time()
    validate_request(req)
    sentences = req.sentences
    vecs = transform(pd.Series(sentences), w2v_model, 300, False)
    preds = predict_sent(vecs, xgb_model_analyze)
    preds["texto"] = sentences
    res_json = preds.to_dict(orient='records')
    response = {}
    response['result'] = res_json   
    id_ = req.id
    if id_ != None:
        response['id'] = req.id
    result = jsonable_encoder(response)
    print('\nProcesso "ALL" finalizado em:', format(time.time()-inicio, '.2f'), 'seg.\n')
    return result


@app.post('/v1/keys', summary="Extração de palavras-chave", response_model=ResponseKeys)
def get_keys(req: Request = Body(...,example=docs.requestExample)):
    inicio = time.time()
    validate_request(req)
    sentences = req.sentences
    frame = pd.DataFrame(sentences, columns=['texto'])
    keys = clean_text(pd.Series(sentences))
    keys = keys.apply(lambda s: remove_stop_words(s)).str.join(' ')
    frame['key_words'] = keys.apply(get_key_words)
    frame["texto"] = sentences
    res_json = frame.to_dict(orient='records')
    response = {}
    response['result'] = res_json   
    id_ = req.id
    if id_ != None:
        response['id'] = req.id
    result = jsonable_encoder(response)
    print('\nProcesso finalizado em:', format(time.time()-inicio, '.2f'), 'seg.\n')
    return result

@app.post('/v1/wordfreq', summary="Calculo de frequência das palavras",response_model=ResponseWordFreq)
def get_word_freq(req: Request = Body(...,example=docs.requestExample)):
    inicio = time.time()
    validate_request(req)
    sentences = req.sentences
    frame = clean_text(pd.Series(sentences))
    frame = frame.dropna()
    frame = frame.apply(lambda s: remove_stop_words(s, stop_words=stop_words_full))
    frame = frame.apply(join_words)
    result = {'result': word_freq.get_key_words_count(frame)}
    print('\nProcesso finalizado em:', format(time.time()-inicio, '.2f'), 'seg.\n')
    return result

@app.post('/v1/ngrams', summary="Calculo de frequência de n-gramas", response_model=ResponseNgrams)
def get_ngrams(req: Request = Body(...,example=docs.requestExampleNgram)):
    inicio = time.time()
    validate_request(req)
    sentences = req.sentences
    frame = clean_text(pd.Series(sentences))
    frame = frame.dropna()
    frame = frame.apply(lambda s: remove_stop_words(s, stop_words=stop_words_full))
    frame = frame.apply(join_words)
    result = {'result': ngrams.get_n_grams(frame, req.ngram)}
    print('\nProcesso finalizado em:', format(time.time()-inicio, '.2f'), 'seg.\n')
    return result

@app.post('/v1/clean_text', summary="Normalização de texto", include_in_schema=True)
def text_clear(req: Request = Body(...,example=docs.requestExample)):    
    inicio = time.time()
    validate_request(req)
    inicio = time.time()    
    sentences = req.sentences
    frame = clean_text(pd.Series(sentences))
    frame = frame.apply(lambda s: remove_stop_words(s, stop_words=stop_words_full))
    r = frame.apply(join_words).tolist()
    result = {'result' : r}
    print('\nProcesso finalizado em:', format(time.time()-inicio, '.2f'), 'seg.\n')
    return result


@app.get('/redirect', status_code=307, response_class=Response, include_in_schema=False)
async def redirect():
    return RedirectResponse('/docs')


@app.get('/', include_in_schema=False)
def status():
    api_intro = {'status': 'ok'}
    return api_intro


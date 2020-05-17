#!/usr/bin/env python
# coding: utf-8

# Importing libraries
import numpy as np
import pandas as pd
import re
import os
import time
from datetime import datetime
from time import gmtime, strftime
import multiprocessing as mp
from pathos.multiprocessing import ProcessingPool as Pool
import glob
from unidecode import unidecode
import regex

stop_words = dict.fromkeys(list(pd.read_csv('input/stop_words_.txt', names=['stop']).stop), 1)


num_cores=mp.cpu_count()-1

def remove_stop_words(sentence):
    stop = []
    if type(sentence) != list:
        return []
    for word in sentence:
        if not stop_words.get(word):
            stop.append(word)
    return stop 

def rename_wrong_words(sentences, wrong_worgs=regex.WRONG_WORDS):
    regex.WRONG_WORDS.update(regex.BIGRAMS)
    sentences = sentences.str.lower().replace(to_replace=regex.WRONG_WORDS, regex=True)
    return sentences

def remove_accents(sentence):
    return unidecode(sentence)

def text_normalizer(sentences, num_to_word=regex.NUM_TO_WORD, regex_dic=regex.REGEX_DIC):
    sentences = sentences.apply(remove_accents)
    sentences = sentences.replace(to_replace=num_to_word, regex=True)
    sentences = sentences.replace(to_replace=regex_dic, regex=True)
    return sentences


def clean_text(sentences):
    sentences = sentences.apply(lambda w: str(w).lower())
    sentences = text_normalizer(sentences)
    sentences = rename_wrong_words(sentences)
    sentences = sentences.str.findall(r'[a-z]+|[\?!,]')
    sentences = sentences.apply(remove_stop_words).str.join(' ')
    return sentences


def parallelize_dataframe(df, func, num_partitions=num_cores, num_cores=num_cores):
    df_split = np.array_split(df, num_partitions, axis=0)
    pool = Pool(num_cores)
    df = pd.concat(pool.map(func, df_split))
    pool.close()
    pool.join()
    pool.clear()
    return df

def process_files(input_, output):
    files = glob.glob(input_ + '*.csv')
    if not os.path.exists(output):
        os.mkdir(output)
    for f in files:
        if os.path.exists(output + os.path.basename(f)):
            continue
        print('Processando o arquivo: ', os.path.basename(f))
        inicio = time.time()
        df = pd.read_csv(f)
        df['review'] = parallelize_dataframe(df.review, clean_text)
        df = df.dropna()
        df = df[df.review.str.split().str.len() > 0]
        df.to_csv(output + os.path.basename(f), index=False)
        print('Arquivo salvo: ', os.path.basename(f), ' em ', format(time.time()-inicio, '.2f'), 'seg')

def process_file(df, filename, output='input/comentarios/'):
    if not os.path.exists(output):
        os.mkdir(output)
    output_file = os.path.join(output, filename)
    if not os.path.exists(output_file):
        print('Pré-processamento do arquivo: ', filename)
        df['review'] = parallelize_dataframe(df.review, clean_text)
        df = df.dropna()
        df = df[df.review.str.split().str.len() > 0]
        df.to_csv(output_file, index=False)


# def main():
#     input_ = 'input/comentarios/'
#     output = 'input/comentarios_normalizados/'
#     process_files(input_, output)
#     print('Pré-processamento finalizado!')
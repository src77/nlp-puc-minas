#!/usr/bin/env python
# coding: utf-8

# sudo apt-get install python3-dev build-essential
# importante instalar antes do gensin

# Importing libraries
import gensim
from gensim.models import word2vec
from gensim.models import KeyedVectors
import time
from datetime import datetime
from time import gmtime, strftime
import ast
import numpy as np
import pandas as pd
import glob
import os
import gc
import extract_reviews

# Iterator to use less memory
class ProcessSentencesFromFiles(object):
    def __init__(self, files):
        self.files = files
        self.time = time.time()
        self.epoch = 0
        self.count = 0

    def __iter__(self):
        for i, f in enumerate(self.files):
            print('Arquivo', os.path.basename(f), '<==>', i+1,'de', len(self.files),' <==> época:', self.epoch,)
            df = pd.read_csv(f)
            for row in df.review:
                self.count += 1
                try:
                    yield row.split()
                except:
                    if row == 'review':
                        print('1. Aconteceu um erro na sentença:', row)
                        pass
                    else:
                        print('2 Aconteceu um erro na sentença:', row)
                        pass
            del df
            gc.collect()

        print('Treinamento da época', self.epoch, 'finalizado em', format(time.time() - self.time, '0.2f'), 'seg')
        self.time = time.time()
        self.count = 0
        self.epoch += 1

#Pré-processamento e limpeza de texto para acelerar a construção do modelo
extract_reviews.main()

train_path = glob.glob('input/comentarios/*.csv')
sentences = ProcessSentencesFromFiles(train_path)

print('Treinamento w2v iniciado....') 
inicio = time.time()
num_features = 300

w2v_model = word2vec.Word2Vec(min_count=5,
                              window=5,
                              size=num_features,
                              sample=0.0,
                              alpha=0.025,
                              workers=4)

w2v_model.build_vocab(sentences)
print("Tamanho do corpus: ", w2v_model.corpus_count)
print('Tamanho do vocabulario: ', len(w2v_model.wv.vocab))
w2v_model.train(sentences, total_examples=w2v_model.corpus_count, epochs=100)

print('Treinamento w2v finalizado em: ', format(time.time()-inicio, '0.2f'), 'seg')
model_name = "models/w2v_model"+str(num_features)+"-" + \
    datetime.now().strftime("%Y%m%d-%H%M%S") 

# # Salva o modelo em formato que permite continuar treinamento depois, consome mais espaço.
# w2v_model.save(model_name + ".model")

word_vectors = w2v_model.wv
word_vectors.save(model_name + '.kv')

print('Modelo salvo: ', model_name)


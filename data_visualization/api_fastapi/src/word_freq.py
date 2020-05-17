import gensim
import pandas as pd
import numpy as np
import os
import operator
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.feature_extraction.text import TfidfVectorizer
dot_ = '.' if os.path.exists('./input') else '..'
key_words = pd.read_csv(dot_+'/input/key_words.csv')
key_words_bi = pd.read_csv(dot_+'/input/key_words_bi_gram.csv')
key_words = pd.concat([key_words,key_words_bi])
dic = dict(zip(key_words.key.values, key_words.value.values))
# dic_bi = dict(zip(key_words.key.values, key_words.value.values))

def get_tfidf(corpus):
    vectorizer = TfidfVectorizer()
    vectors = vectorizer.fit_transform(corpus)
    sum_words = vectors.sum(axis=0)
    names = vectorizer.get_feature_names()
    dic_words = dict(zip(names, sum_words.tolist()[0]))
    words_f = sorted(dic_words.items(), key=lambda x: x[1], reverse=True)
    print(words_f[:50])

    keys = {}    

    for k,v in dic.items():
        try:
            value = dic_words[k]
            keys[dic[k]] = value
        except:
            pass

    words_freq = dict(sorted(keys.items(), key=lambda x: x[1], reverse=True))
    return words_freq

    # print(corpus)

    # sentences = corpus.values
    # dictionary = gensim.corpora.Dictionary(sentences)
    # print(len(dictionary))
    # # dictionary.filter_extremes(no_below=5, no_above=0.1, keep_n=100000)
    # bow_corpus = [dictionary.doc2bow(doc) for doc in sentences]
    # lda_model = gensim.models.LdaMulticore(bow_corpus, num_topics=1, id2word=dictionary, passes=10, workers=4)

    # print(lda_model.print_topics(-1))

def get_key_words_count(corpus):
    vec = CountVectorizer()
    bag_of_words = vec.fit_transform(corpus)
    sum_words = bag_of_words.sum(axis=0) 
    words_freq = { word: int(sum_words[0, idx]) for word, idx in     
                  vec.vocabulary_.items() }    
    return words_freq

# coding: utf-8
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer

def get_n_grams(corpus, ngram):
    if ngram == None:
        ngram = 2
    vec = CountVectorizer(ngram_range=(ngram, ngram),  
            max_features=5000).fit(corpus)
    bag_of_words = vec.transform(corpus)
    sum_words = bag_of_words.sum(axis=0) 
    # sum_words = np.count_nonzero(bag_of_words.todense(), axis=0)
    words_freq = [(word, int(sum_words[0, idx])) for word, idx in     
                  vec.vocabulary_.items()]
    
    for i,w in enumerate(words_freq):
        word = w[0].split()
        if word[1] == 'nao':
           del words_freq[i] 

    words_freq = dict(sorted(words_freq, key = lambda x: x[1], reverse=True))
    return words_freq


def ngrams(sequence, n, pad_left=False, pad_right=False, pad_symbol=None):
    """
    A utility that produces a sequence of ngrams from a sequence of items.
    For example:

    >>> ngrams([1,2,3,4,5], 3)
    [(1, 2, 3), (2, 3, 4), (3, 4, 5)]

    Use ingram for an iterator version of this function.  Set pad_left
    or pad_right to true in order to get additional ngrams:

    >>> ngrams([1,2,3,4,5], 2, pad_right=True)
    [(1, 2), (2, 3), (3, 4), (4, 5), (5, None)]

    @param sequence: the source data to be converted into ngrams
    @type sequence: C{sequence} or C{iterator}
    @param n: the degree of the ngrams
    @type n: C{int}
    @param pad_left: whether the ngrams should be left-padded
    @type pad_left: C{boolean}
    @param pad_right: whether the ngrams should be right-padded
    @type pad_right: C{boolean}
    @param pad_symbol: the symbol to use for padding (default is None)
    @type pad_symbol: C{any}
    @return: The ngrams
    @rtype: C{list} of C{tuple}s
    """

    if pad_left:
        sequence = chain((pad_symbol,) * (n-1), sequence)
    if pad_right:
        sequence = chain(sequence, (pad_symbol,) * (n-1))
    sequence = list(sequence)

    count = max(0, len(sequence) - n + 1)
    return [tuple(sequence[i:i+n]) for i in range(count)] 
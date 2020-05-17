#TODO
#Mudar todas as classes de modelos de retorno para esse arquivo.

requestExample = {
    "sentences": [
        "Não gostei do atendimento",
        "Gostei muito do atendimento"
    ]
}

requestExampleNgram = {
    "sentences": [
        "Não gostei do atendimento",
        "Gostei muito do atendimento"
    ],
    "ngram": 2
}

responseExampleAll = [{
    'texto' : "Não gostei do atendimento",
    'sent' : -1,
    'key_words' : ["atendimento"]
}]

responseExampleCat = [{
    'texto' : "Não gostei do atendimento",
    'cartao' : 0,
    'atend' : 0,   
    'invest' : 0,
    'emprestimo' : 0,
    'prob_tec' : 0,
    'conta' : 0,
    'app' : 0
}]

responseExampleSent = [{
    'texto' : "Não gostei do atendimento",
    'sent' : -1
}]


responseExampleKeys = [{
    "texto": "Não gostei do atendimento",
    "key_words": [
        "atendimento"
    ]
}]


responseExampleWordFreq = {
    "nao": 1,
    "gostei": 1,
    "atendimento":1

}

responseExampleNgrams = {
    "nao gosto": 1,
    "gosto atendimento": 1
}
# coding: utf-8

NUM_TO_WORD = {'\\b0\\b': 'zero', '\\b1\\b': 'um', '\\b2\\b': 'dois', '\\b3\\b': 'tres', '\\b4\\b': 'quatro',
               '\\b5\\b': 'cinco', '\\b6\\b': 'seis', '\\b7\\b': 'sete', '\\b8\\b': 'oito', '\\b9\\b': 'nove',
               '\\b10\\b': 'dez', '\\b100\\b': 'cem', '\\b1000\\b': 'mil'}
URL_REGEX = r'\S*(http|ftp)\S*'
ESPECIAL_REGEX = r'[<>\|\\.\/#$%\^&\*;:{}=\-_`~()]'
EMAIL_REGEX = r'\S*@\S*'
REGEX_DIC = {URL_REGEX: ' ', '"': ' ', '\n': ' ', '\r': ' ',
             '<br  >': ' ', EMAIL_REGEX: ' ', ESPECIAL_REGEX: ' '}
WRONG_WORDS = {
    '\\bvc\\b': 'voce', '\\bmt\\b': 'muito', '\\bboa\\b': 'bom',
    'so que nao': 'muito ruim pessimo', 'sqn': 'muito ruim pessimo', 'soquenao': 'muito ruim pessimo', 
}

BIGRAMS = {
    'banco central': 'bacen', '\bdois via': 'segunda_via', 'segunda via': 'segunda_via', '\bbb code': 'bb_code',
    '\bcentral.{0,5}atend': 'sac', '\bimposto.{0,5}renda': 'imposto_renda', '\buso.{0,5}exterior': 'uso_exterior',
    'terminal.{0,5}autoatendimento': 'taa', '\bcaixa.{0,2}eletronico': 'taa', '\bconta facil':'conta_facil'
}

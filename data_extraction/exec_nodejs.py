from time import time
import os
from Naked.toolshed.shell import execute_js

inicio = time()

empresas = {
    'bradesco': 103, 'santander': 98, 'brasil': 27198, 'itau': 2406, 'caixa': 105, 'xp': 25426, 'porto_seguro': 764, 'bradesco_seguros': 757,
    'cielo': 17494, 'inter': 12949, 'bmg': 4800, 'safra': 117, 'original': 10559, 'next': 187626, 'nubank': 88850,
    'guiabolso': 113642, 'cetelem': 4125, 'modalmais': 'Rwvzv-HSLcs_6V9r', 'pag': 'nLNwYi8whuB5CDV5', 'carrefour_cartao': 1625,
    'banco_pan': 95, 'sicoob': 48744, 'banrisul': 101, 'brb': 10875, 'daycoval': 10737, 'blubank': '2GCcLOe2PRqFr4LM', 'santander_cartoes': 42704,
    'caixa_prev': 36505, 'itau_prev': 62260, 'grupo_recovery': 13792, 'itapeva_recuperacao': 86206, 'boa_vista_scpc': 14555, 'maphre': 906,
    'liberty_seguros': 2316, 'itau_auto_residencia': 31605, 'sulamerica_vida': 58834, 'itau_seguros_cap': 762, 'sulamerica_auto': 770
}

for k,v in empresas.items():
    if (os.path.exists("output/"+k)):
        print(k.upper(), 'já está sendo processado....')
        continue
    success = execute_js('app_reclame_aqui.js 1 '+k)
    if success:
        print('Processamento da empresa',k,'finalizado!')


print('Tudo foi finalizado em',(time()-inicio)/60,'.min')
from datetime import date
from datetime import timedelta
from datetime import datetime, timezone
import pandas as pd
import os
from glob import glob
import time
import urllib.request
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait as wait
from selenium.webdriver.support import expected_conditions as EC


def get_chromedriver(use_proxy=False, user_agent=None):
    path = os.path.dirname(os.path.abspath(__file__))
    options = webdriver.ChromeOptions()    
    if user_agent:
        options.add_argument('--user-agent=%s' % user_agent)
    driver = webdriver.Chrome(
        os.path.join(path, 'driver/chromedriver_linux_para_versao_80_do_chrome'),
        options=options)
    return driver


ano = 2011
start_date = str(ano) + '-01-01'
end_date = str(ano) + '-12-31'
size_max = 10000
data_content = []

browser = get_chromedriver()


bancos = [
    {'name': "bb", 'store': "ios", '_id': 330984271, },
    {'name': "bb", 'store': "android", '_id': "br.com.bb.android"},
    {'name': "bradesco", 'store': "ios", '_id': 336954985, },
    {'name': "bradesco", 'store': "android", '_id': "com.bradesco"},
    {'name': "caixa", 'store': "ios", '_id': 490813624, },
    {'name': "caixa", 'store': "android", '_id': "br.com.gabba.Caixa"},
    {'name': "itau", 'store': "ios", '_id': 474505665, },
    {'name': "itau", 'store': "android", '_id': "com.itau"},
    {'name': "santander", 'store': "ios", '_id': 613365711, },
    {'name': "santander", 'store': "android", '_id': 'com.santander.app' },
    {'name': "nubank", 'store': "ios", '_id': 814456780},
    {'name': "nubank", 'store': "android", '_id': "com.nu.production"},
    {'name': "inter", 'store': "ios", '_id': 839711154},
    {'name': "inter", 'store': "android", '_id': "br.com.intermedium"},
    {'name': "neon", 'store': "ios", '_id': 1127996388},
    {'name': "neon", 'store': "android", '_id': "br.com.neon"},
    {'name': "next", 'store': "ios", '_id': 1133682678},
    {'name': "next", 'store': "android", '_id': "br.com.bradesco.next"},
    {'name': "c6", 'store': "ios", '_id': 1463463143},
    {'name': "c6", 'store': "android", '_id': "com.c6bank.app"},
    {'name': "original", 'store': "ios", '_id': 980234079},
    {'name': "original", 'store': "android", '_id': "br.com.original.bank"},
    {'name': "pag-bank", 'store': "ios", '_id': 1186059012},
    {'name': "pag-bank", 'store': "android", '_id': "br.com.uol.ps.myaccount"},
    {'name': "sicoob", 'store': "ios", '_id': 416696406},
    {'name': "sicoob", 'store': "android", '_id': "br.com.sicoobnet"},
    {'name': "santander-way", 'store': "ios", '_id': 1154266372 },
    {'name': "santander-way", 'store': "android", '_id': 'br.com.santander.way' },
    {'name': "bradesco-cartoes", 'store': "ios", '_id': 1073889634},
    {'name': "bradesco-cartoes", 'store': "android", '_id': "br.com.bradesco.cartoes"},
    {'name': "bradesco-exclusive", 'store': "ios", '_id': 375748811},
    {'name': "bradesco-exclusive", 'store': "android", '_id': "com.bradesco.exclusive"},
    {'name': "paypal", 'store': "ios", '_id': 283646709},
    {'name': "paypal", 'store': "android", '_id': "com.paypal.android.p2pmobile"},
    {'name': "mercado-pago", 'store': "ios", '_id': 925436649},
    {'name': "mercado-pago", 'store': "android", '_id': "com.mercadopago.wallet"},
]

def wait_loading():
    wait_time = 0
    while browser.execute_script('return document.readyState;') != 'complete' and wait_time < 60:
        wait_time += 1
        time.sleep(1)


end = 2020
files = glob('csv/app/*.csv')
cont = 0
for banco in bancos:
    cont += 1
    print('Iteração: ', cont,' de: ', len(bancos),' - ', banco)
    base = 'csv/app/'
    file = banco['name'] + '-' + banco['store'] + '.csv'
    path = base + file
    data_content = []
    if(path in files):
        continue
    while True:
        if ano > end:
            break
        url = ("https://app.apptweak.com/api/v2/" + banco['store'] + "/applications/" + str(banco['_id']) + "/reviews/filter/list.json?country=br&language=br&min_rating=1&max_rating=5&" +
               "start_date=" + start_date + "&end_date=" + end_date + "&from=0&size=" + str(size_max))
        browser.get(url)
        time.sleep(1)
        wait_loading()
        elem = browser.find_element_by_tag_name('pre')
        try:
            data = json.loads(elem.text)
        except:
            print('Erro: : \n', banco, '\nurl: \n', url)
            continue

        if(not len(data['content']) and (ano <= end)):
            ano += 1
            start_date = str(ano) + '-01-01'
            end_date = str(ano) + '-12-31'
            continue
        elif(len(data['content']) == size_max):
            end_date = data['content'][9999]['date'].split('T')[0]
        elif(len(data['content']) < size_max):
            ano += 1
            start_date = str(ano) + '-01-01'
            end_date = str(ano) + '-12-31'
        for d in data['content']:
            data_content.append(d)

    if(len(data_content)):
        frame = pd.DataFrame(data_content)
        frame.rename(columns={'body':'review'},inplace=True)
        frame.to_csv(path, index=False)

    ano = 2011
    data_content = []
    start_date = str(ano) + '-01-01'
    end_date = str(ano) + '-12-31'



browser.close()
browser.quit()
 

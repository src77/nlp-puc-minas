from glob import glob
import pandas as pd
def process_files(files):
    registros = 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               
    for f in files:
        df = pd.read_csv(f)
        registros += df.shape[0]
    print('Quantidade de comentários:',registros)

files = glob('input/comentarios/*.csv')


process_files(files)
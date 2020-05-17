import pandas as pd
import glob
import os
import pre_processing

def main():
    input_ = glob.glob('../data_extraction/csv/*/*.csv')
    if not len(input_):
        raise ValueError("Nenhum arquivo encontrado!!!!")

    output = 'input/comentarios/'

    for f in (input_):
        filename = os.path.basename(f)
        print('Extraindo reviews: ',filename)
        file_path = output+filename
        if os.path.exists(file_path):
            continue

        with open(f) as file:
            df = pd.read_csv(file)
            df = df.fillna('')
            cols = df.columns
            if 'reply1' in cols:
                df = pd.concat(
                    [pd.DataFrame({'review': df.review}), pd.DataFrame({'review': df.reply1}),
                    pd.DataFrame({'review': df.reply2}), pd.DataFrame(
                        {'review': df.reply3}),
                    pd.DataFrame({'review': df.reply4}), pd.DataFrame({'review': df.reply5})])
            else:
                df = df[['review']]
            df = df.drop_duplicates()
            #Pre processar e salvar arquivo
            pre_processing.process_file(df,filename)

    print('Processo finalizado!')


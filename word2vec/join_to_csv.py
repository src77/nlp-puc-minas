import pandas as pd
from glob import glob

files = glob('w2v/*')

all = ''

for i, f in enumerate(files):
    with open(f) as file:
        t = pd.read_csv(file)
        if i == 0:
            all = t
        else:
            all = pd.concat([all, t], axis=0)

all.to_csv('all_reviews_app.csv', index=False)

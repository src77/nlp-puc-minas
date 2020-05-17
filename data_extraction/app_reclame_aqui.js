const request = require('request');
const fs = require('fs');
const shell = require('shelljs');
const process = require('process');

function connect_api(url) {
    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (error) reject(error);
            if (!response || response.statusCode != 200) {
                console.log('Erro de resposta!!!!!')
                reject('Invalid status code');
            }
            resolve(body);
        });
    });
}

const promiseTimeout = function (promise, ms) {

    ms = !!ms ? ms : 60000

    // Create a promise that rejects in <ms> milliseconds
    let timeout = new Promise((resolve, reject) => {
        let id = setTimeout(() => {
            clearTimeout(id);
            reject('Timed out in ' + ms + 'ms.')
        }, ms)
    })

    // Returns a race between our timeout and the passed in promise
    return Promise.race([
        promise,
        timeout
    ])
}


function createDir(name) {
    var path = 'csv/reclame_aqui/'
    shell.mkdir('-p', path);
}

function toCsv(data) {
    const items = data
    const replacer = (key, value) => value === null ? '' : value 
    const header = Object.keys(items[0])
    let csv = items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
    csv.unshift(header.join(','))
    csv = csv.join('\r\n')
    return csv
}

function saveData(data, name) {

    var path = 'csv/reclame_aqui/'
    var fileName = path + name + '.csv';
    var csv = toCsv(data)
    fs.writeFileSync(
        fileName, csv
    );

    console.log('Arquivo salvo: ', fileName)
}


let empresas = {
    'bradesco': 103, 'santander': 98, 'brasil': 27198, 'itau': 2406, 'caixa': 105, 'xp': 25426, 'porto_seguro': 764, 'bradesco_seguros': 757,
    'cielo': 17494, 'inter': 12949, 'bmg': 4800, 'safra': 117, 'original': 10559, 'next': 187626, 'nubank': 88850,
    'guiabolso': 113642, 'ifood': 38653, 'cetelem': 4125, 'modalmais': 'Rwvzv-HSLcs_6V9r', 'pag': 'nLNwYi8whuB5CDV5', 'carrefour_cartao': 1625,
    'banco_pan': 95, 'sicoob': 48744, 'banrisul': 101, 'brb': 10875, 'daycoval': 10737, 'blubank': '2GCcLOe2PRqFr4LM', 'santander_cartoes': 42704,
    'caixa_prev': 36505, 'itau_prev': 62260, 'grupo_recovery': 13792, 'itapeva_recuperacao': 86206, 'boa_vista_scpc': 14555, 'maphre': 906,
    'liberty_seguros': 2316, 'itau_auto_residencia': 31605, 'sulamerica_vida': 58834, 'itau_seguros_cap': 762, 'sulamerica_auto': 770
}

let errCount = 0;

async function collectData(start, end, empresa) {
    let comp = empresas[empresa];
    let count = 0;
    let i = start;
    data = [];
    while (i <= end) {
        console.log("Start: ", start, " - End: ", end, " - Actual: ", i)
        console.log(empresa.toUpperCase() + ' - iteração: ', count)
        console.log(`====> Comentarios adicionados #${count * 10}`)
        count++;
        var skip = false;
        // https://iosearch.reclameaqui.com.br/raichu-io-site-search-v1/query/companyComplains/10/0?company=27198&status=ANSWERED&evaluated=bool:false
        const responseStr = await promiseTimeout(connect_api(`https://iosearch.reclameaqui.com.br/raichu-io-site-search-v1/query/companyComplains/10/${i}?company=${comp}`))
            .catch((err) => {
                console.log(err.message, 'erro no item: ', count * 10, ' line 1');
                return promiseTimeout(connect_api(`https://iosearch.reclameaqui.com.br/raichu-io-site-search-v1/query/companyComplains/10/${i}?company=${comp}`))
                    .catch((err) => {
                        console.log(err.message, 'erro no item: ', count * 10, ' line 2');
                        skip = true;
                        errCount++;
                    });
            });


        if (!responseStr) {
            continue;
        }

        let response = JSON.parse(responseStr)

        if (!response.complainResult || !response.complainResult.complains.data.length) {
            break;
        }

        var reclamacoes = response.complainResult.complains
        var categorias = {}
        var problemas = {}
        var produtos = {}
        if (i == start) {
            reclamacoes.categories.forEach(e => {
                categorias[e.id] = e.name
            });

            reclamacoes.problems.forEach(e => {
                problemas[e.id] = e.name
            });

            reclamacoes.products.forEach(e => {
                produtos[e.id] = e.name
            });
        }

        var result = reclamacoes.data.map(async (item) => {

            categoria = !!categorias[item.category] ? categorias[item.category] : ''
            tipo_problema = !!problemas[item.problemType] ? problemas[item.problemType] : ''
            outros_problemas = !!item.otherProblemType ? item.otherProblemType : ''
            produto = !!produtos[item.productType] ? produtos[item.productType] : ''

            var info = {
                "id": item.id,
                "data": item.created,
                "empresa": item.fantasyName,
                "titulo": item.title,
                "review": item.description,
                "reply1": "",
                "reply2": "",
                "reply3": "",
                "reply4": "",
                "reply5": "",
                "interacoes": 0,
                "categoria": categoria,
                "tipo_problema": tipo_problema,
                "outros_problemas": outros_problemas,
                "produto": produto,
                "estado": item.userState,
                "cidade": item.userCity
            }

            if (item.interactions.length) {
                const resposta = await promiseTimeout(connect_api(`https://iosite.reclameaqui.com.br/raichu-io-site-v1/complain/public/${item.id}`))
                    .catch((err) => {
                        console.log(err.message, 'erro no item: ', count * 10, ' line 3');
                        errCount++;
                    });

                if (!!resposta) {
                    var interacoes = JSON.parse(resposta).interactions

                    var i = 1
                    interacoes.forEach((e) => {
                        if (i < 6) {
                            info['reply' + i] = e.message;
                        }
                        info['interacoes'] += 1;
                        i++;
                    })
                }


            }
            return info;
        })

        result = await Promise.all(result).then(function (res) {
            return res
        }).catch(function (err) {
            console.log(err.message, 'erro no item: ', count * 10, ' line 5');
            skip = true;
            errCount++;
        });

        if (!skip) {
            data.push(...result)
        }

        i = i + 10

    }
    return data
}


function generateParams(total, parts, empresa) {
    if (isNaN(total)) {
        throw "Não é um numero!!!!!"
    }
    if (total === parts) {
        return [0, total, empresa]
    } else if (total < parts) {
        throw 'Total maior que partes!!!!!!!!'
    }

    var parts = Math.floor(1 + total / 20) < parts ? Math.floor(1 + total / 20) : parts
    var p = Math.floor(total / parts)
    var params = []
    var start = 0
    var v = 10 - p % 10 //Validor de tamanho do tamanho de cada parte
    var end = v <= 5 ? p + v : Math.floor(p / 10) * 10
    var ratio = end;
    var i = 0;
    while (i < parts) {
        var arr = []
        if (start > total) {
            break
        }
        if (i + 1 == parts) {
            end = total - total % 10
        }
        arr.push(start);
        arr.push(end);
        arr.push(empresa);
        params.push(arr);
        start = end + 10;
        end += ratio;
        next = end;
        i++;
    }

    return params
}



// var total = 1000;
async function getData(n_parallel, empresa) {
    let comp = empresas[empresa];
    var response = await connect_api(`https://iosearch.reclameaqui.com.br/raichu-io-site-search-v1/query/companyComplains/10/0?company=${comp}`)
    var total = JSON.parse(response).complainResult.complains.count
    var params = generateParams(total, n_parallel, empresa)
    createDir(empresa);
    var results = params.map(async (param) => {
        return await collectData(param[0], param[1], param[2])
    });
    Promise.all(results)
        .then((dados) => {
            var saved = false;
            try {
                saveData(dados[0], empresa)
                saved = true
                console.log('Processo finalizado com', errCount, 'erros!')
            } catch (err) {
                console.log(err.message)
                saved = false;
            }
        })

}

if (!parseInt(process.argv[2])) {
    throw "Quantidade inválida!"
}
if (!empresas[process.argv[3].toLowerCase()]) {
    throw "Empresa não cadastrada!"
}

getData(parseInt(process.argv[2]), process.argv[3].toLowerCase())


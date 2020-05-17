
let path = "http://localhost:8000"
let file = 'reviews.csv'

const DEFAULTCONFIG = {
    title: { text: 'Sem resultados' },
    xAxis: {
        categories: []
    },
    series: [{
        data: [],
    }]
}

async function loadJSON(file) {
    let options = {
        headers: {
            'Content-Type': 'application/json'
        }
    }
    let response = await fetch(file, options);
    let result = await response.json();
    return result
}

function exportToCsv(filename, arrayList) {
    var processRow = function (row) {
        var finalVal = '';
        for (var j = 0; j < row.length; j++) {
            var innerValue = row[j] === null ? '' : row[j].toString();
            // if (row[j] instanceof Date) {
            //     innerValue = row[j].toLocaleString();
            // };
            var result = innerValue.replace(/"/g, '""');
            if (result.search(/("|,|\n)/g) >= 0)
                result = '"' + result + '"';
            if (j > 0)
                finalVal += ',';
            finalVal += result;
        }
        return finalVal + '\n';
    };

    var csvFile = '';
    for (var i = 0; i < arrayList.length; i++) {
        csvFile += processRow(arrayList[i]);
    }

    var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, filename);
    } else {
        var link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

async function connectAPI(url, sentences) {
    let options = {
        origin: '*',
        method: 'post',
        mode: 'cors',
        timeout: 60000,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(sentences)
    }
    let response = await fetch(url, options);
    let result = await response.json();
    return result
}



function csvToArray(text) {
    let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
    for (l of text) {
        if ('"' === l) {
            if (s && l === p) row[i] += l;
            s = !s;
        } else if (',' === l && s) l = row[++i] = '';
        else if ('\n' === l && s) {
            if ('\r' === p) row[i] = row[i].slice(0, -1);
            row = ret[++r] = [l = '']; i = 0;
        } else row[i] += l;
        p = l;
    }
    return ret;
};

async function getDataCSV(path) {
    let response = await fetch(path);
    let data = await response.text();
    let csv = csvToArray(data);
    return csv;
}

async function getAllAnalysesServer(sentences) {
    let url = path + '/v1/all'
    let result = await connectAPI(url, sentences)
    return result
}

async function getSentServer(sentences) {
    let url = path + '/v1/analyze'
    let result = await connectAPI(url, sentences)

    return result
}

async function clean_text(sentences) {
    let url = path + '/v1/clean_text'
    return await connectAPI(url, sentences)
}

async function getNgramsServer(sentences, ngram) {
    let url = path + '/v1/ngrams'
    sentences['_ngram'] = ngram
    let result = (await connectAPI(url, sentences)).result

    let axis = {
        n_gram: [],
        count: []
    }

    if (result.length === 1 && result[0].n_gram === '') {
        return axis;
    }


    Object.keys(result).forEach((key) => {
        axis.n_gram.push(key);
        axis.count.push(result[key]);
    })

    return axis;
}

async function getCountWordsServer(sentences, bi_gram) {
    let url = path + '/v1/wordfreq'
    sentences['_bi_gram'] = bi_gram
    let result = await connectAPI(url, sentences)
    return result;
}

function getNgrams(sentences, n, topn, attr) {
    var dict = {};
    sentences.map(sent => {
        generateNGrams(n).grams(sent[attr]).map((cur, i) => {
            if (!!dict[cur]) {
                dict[cur]++;
            } else {
                dict[cur] = 1;
            }
        })
    })

    var sortable = [];

    for (let key in dict) {
        sortable.push([key, dict[key]]);
    }

    sortable.sort(function (a, b) {
        return b[1] - a[1];
    });

    var objSorted = { n_gram: [], count: [] };
    sortable.forEach(function (item) {
        objSorted.n_gram.push(item[0]);
        objSorted.count.push(item[1]);
    });

    objSorted = { n_gram: objSorted.n_gram.slice(0, topn), count: objSorted.count.slice(0, topn) };

    return objSorted;
}

function generateNGrams(n) {

    if (typeof n !== 'number' || isNaN(n) || n < 1 || n === Infinity) {
        throw new Error('`' + n + '` is not a valid argument for n-gram')
    }

    function grams(value, normalize) {
        var nGrams = []
        var index

        if (value === null || value === undefined) {
            return nGrams
        }

        var frase = value;

        if (!!normalize) {
            frase = frase.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        }

        let words = frase.split(' ')

        words = words.slice ? words : String(words)
        index = words.length - n + 1

        if (index < 1) {
            return nGrams
        }

        while (index--) {
            nGrams[index] = words.slice(index, index + n).join(' ')
        }

        return nGrams
    }

    return { grams: grams }
}

function filterNgrams(data, attr, n_gram, filter_only) {
    let allKeys = {};
    let tam = n_gram.split(' ').length;
    let data_ = data.reduce((acc, cur, index) => {
        let current = generateNGrams(tam).grams(cur[attr], filter_only);
        if (current && current.length) {
            for (var i = 0; i < current.length; i++) {
                if (current[i] == n_gram) {
                    acc.push(cur);
                    if (!filter_only) {
                        Object.keys(cur.key_words).forEach(key => {
                            if (allKeys[key] !== undefined) {
                                allKeys[key]++;
                            }
                            else {
                                allKeys[key] = 1;
                            }
                        });
                    }
                    break;
                }
            }
        }
        return acc;
    }, [])

    return { data: data_, tags: allKeys }
}


function reduceDate(array) {
    return array.reduce(function (dates, date) {
        if (date in dates) {
            dates[date]++;
        }
        else {
            dates[date] = 1;
        }
        return dates;
    }, {});
}

function alignItens(array, obj) {
    let dict = {}
    Object.keys(obj).forEach(value => {
        let arr = []
        array.forEach((e) => {
            if (!!obj[value][e]) {
                arr.push(obj[value][e])
            } else {
                arr.push(0)
            }
        })
        dict[value] = arr;
    })
    return dict;
}

function formatDate(date) {
    let day = new Date(date).getDate();
    let month = new Date(date).getMonth() + 1;
    let year = new Date(date).getFullYear();
    return (day < 10 ? '0' + day : day) + '/' + (month < 10 ? '0' + month : month) + '/' + year;
}

function filterDate(data, value, typeDate) {
    return data.filter(e => {
        var v = moment(e['date']).format(getDateFormatter(typeDate))
        if (typeDate === 'week') {
            v = moment(e['date']).startOf(typeDate).format(getDateFormatter(typeDate))
            return v == value
        }
        return v == value
    });
}

function sortDate(data) {

    var sortArray = data.map(function (arr, idx) {
        return { idx: idx, arr: arr }
    })

    sortArray.sort(function (a, b) {
        if (a.arr.date < b.arr.date) return -1;
        if (a.arr.date > b.arr.date) return 1;
        return a.idx - b.idx
    });

    return sortArray.map(function (val) {
        return val.arr
    });
}

function binarySearch(array, attr, target) {
    let dateFormat = 'DD/MM/YY'
    var target = moment(target).format(dateFormat)
    var startIndex = 0;
    let endIndex = array.length - 1;
    var position = 0;
    while (startIndex <= endIndex) {
        let middleIndex = Math.floor((startIndex + endIndex) / 2);
        if (target === moment(array[middleIndex][attr]).format(dateFormat)) {
            position = middleIndex;
            break;
        }
        if (target > array[middleIndex]) {
            startIndex = middleIndex + 1;
        }
        if (target < array[middleIndex]) {
            endIndex = middleIndex - 1;
        }
    }
    return position;
}


function getDataIntervalArray(data, attr, startDate, endDate, sort) {
    if (!startDate || !endDate) return data;
    return data.reduce((acc, cur, index, arr) => {
        let cond = cur[attr] >= startDate && cur[attr] <= endDate;
        if (cond) {
            acc.push(cur);
        };
        return acc;
    }, [])
}

function translateArray(type) {
    let data = comments[type];
    let arr = dataSerie.data[category].data[type]
    return arr.map((e) => {
        return data[e];
    })
}

function getDateFormatter(type) {
    let mask = ''
    switch (type) {
        case 'day':
            mask += 'DD/MM/YY'
            break;
        case 'week':
            mask += 'DD/MM/YY'
            break;
        case 'month':
            mask += 'MM/YY'
            break
        case 'year':
            mask += 'YYYY'
            break;
    }
    return mask;
}

function processDate(data, groupBy) {
    let mask = getDateFormatter(groupBy)
    let dates = {}
    data.forEach(date => {
        var e = date.date
        if (groupBy === 'week') {
            e = moment(e).startOf('week').format(mask)
        } else {
            e = moment(e).format(mask)
        }
        if (e in dates) {
            dates[e]++;
        }
        else {
            dates[e] = 1;
        }
    })
    return { x: Object.keys(dates), y: Object.values(dates) }
}

function changeHighchartsLine(data, ngram, groupBy) {

    if (!data.length) {
        Line.zoom();
        Line.update(DEFAULTCONFIG);
        return data;
    }

    let config = {
        xAxis: {
            categories: []
        },
        series: [{
            data: [],
            name: 'Quantidade'
        }]
    }

    var mainLabel = ngram;
    var filteredData = data;

    if (!!ngram) {
        filteredData = filterNgrams(data, 'clean', ngram).data;
    } else {
        mainLabel = dataSerie.mainSelectLabel + ' : ' + filteredData.length;
    }

    var dates = processDate(filteredData, groupBy)

    config.title = { text: mainLabel }
    config.xAxis.categories = dates.x;
    config.series[0].data = dates.y;

    if (config.xAxis.categories.length === 1) {
        config.xAxis.categories.splice(0, 0, '');
        config.xAxis.categories.push('');
        config.series[0].data.splice(0, 0, 0)
        config.series[0].data.push(0)
    }

    Line.zoom();
    Line.update(config);

    return filteredData;

}

function getConfigHighchartsLine(data) {

    if (!data.length) return DEFAULTCONFIG;

    async function clickEvent(point) {
        let x = point;
        let ngram = dataSerie.nGramClicked;
        let type = dataSerie.type;
        let category = dataSerie.category;
        let data = dataSerie.data[category].data[type];
        var filtered = '';
        if (dataSerie.nGramClicked) {
            ngram = dataSerie.nGramClicked;
            var data_ = filterDate(data, x, dataSerie.groupBy);
            var filtered_ = filterNgrams(data_, 'clean', ngram);
            commentActive.data = filtered_.data;
            filtered = filtered_.data;
            createTags(commentActive.data, filtered_.tags);

        } else {
            filtered = filterDate(data, x, dataSerie.groupBy);
        }
        onClickFilterEvent(filtered);
        showPage();
    }

    let config = {
        chart: {
            type: 'line',
            zoomType: 'x',
            resetZoomButton: {
                position: {
                    x: -25,
                    y: -40
                }
            },
            events: {
                click: async function () {
                    clickEvent(recent);
                }
            }
        },
        title: {
            text: ''
        },
        tooltip: {
            valueDecimals: 2,
            formatter: function () {
                recent = this.x;
                return this.x + '<br>' +
                    '</b>Quantidade: <b>' + this.y;
            }
        },
        xAxis: {
            categories: []
        },
        yAxis: {
            title: {
                text: '     '
            }
        },
        plotOptions: {
            line: {
                dataLabels: {
                    enabled: true
                }
            },
            series: {
                cursor: 'pointer',
                point: {
                    events: {
                        click: async function () {
                            let x = this.category;
                            clickEvent(x);
                        }
                    }
                }
            }
        },
        legend: {
            enabled: false
        },
        colors: ['rgba(153, 102, 255, 1)'],
        series: [{
            data: [],
            name: 'Quantidade'
        }]
    }


    var mainLabel = dataSerie.mainSelectLabel + ' : ' + data.length;

    var data = processDate(data, 'day')

    config.title.text = mainLabel;
    config.xAxis.categories = data.x;
    config.series[0].data = data.y;

    if (config.xAxis.categories.length === 1) {
        config.xAxis.categories.splice(0, 0, '');
        config.xAxis.categories.push('');
        config.series[0].data.splice(0, 0, 0)
        config.series[0].data.push(0)
    }

    return config;
}

function resetSelectChart(Chart) {
    let len = Chart.series[0].data.length;
    for (i = 0; i < len; i++) {
        Chart.series[0].data[i].select(false, true);
    }
}

function changeHighchartsBar(X, Y, topn) {

    if (!X || !X.length) {
        Bar.update(DEFAULTCONFIG);
        return;
    }

    let type = dataSerie.type;
    let color = type === 'negative' ? 'rgba(255, 99, 132, .8)' : 'rgba(54, 162, 235, .8)'
    let colorSelected = type === 'negative' ? 'rgba(246, 36, 89, .9)' : 'rgba(54, 140, 235, 1)'
    let borderColor = type === 'negative' ? 'rgba(255, 99, 132, 1)' : 'rgba(54, 162, 235, 1)'
    var topn = !!topn ? topn : 15;


    let config = {
        title: {
            text: dataSerie.mainSelectLabel
        },
        xAxis: {
            categories: X.slice(0, topn)
        },
        plotOptions: {
            bar: {
                borderColor: borderColor,
                color: color,
            },
            series: {
                states: {
                    select: {
                        color: colorSelected
                    },
                    hover: {
                        color: colorSelected
                    }
                }
            }
        },
        series: [{
            data: Y.slice(0, topn),
        }]
    }

    resetSelectChart(Bar);
    Bar.update(config);

}

function getConfigHighchartsBar(X, Y, topn) {

    if (!X || !X.length) {
        return DEFAULTCONFIG;
    }

    let type = dataSerie.type;
    let color = type === 'negative' ? 'rgba(255, 99, 132, .8)' : 'rgba(54, 162, 235, .8)'
    let colorSelected = type === 'negative' ? 'rgba(246, 36, 89, .9)' : 'rgba(54, 140, 235, 1)'
    let borderColor = type === 'negative' ? 'rgba(255, 99, 132, 1)' : 'rgba(54, 162, 235, 1)'
    var topn = !!topn ? topn : 15;

    let config = {
        chart: {
            type: 'bar'
        },
        title: {
            text: dataSerie.mainSelectLabel
        },
        xAxis: {
            categories: X.slice(0, topn)
        },
        yAxis: {
            allowDecimals: false,
            title: {
                enabled: false
            }
        },
        plotOptions: {
            bar: {
                dataLabels: {
                    enabled: true
                },
                borderColor: borderColor,
                color: color,
                cursor: 'pointer'
            },
            series: {
                cursor: 'pointer',
                point: {
                    events: {
                        click: async function (evt) {
                            let ngram = this.category;
                            let category = dataSerie.category;
                            if (dataSerie.data[category].tags.current === ngram) return;
                            loading();
                            setTimeout(() => {
                                dataSerie.nGramClicked = ngram;
                                let data = groupByDate(selectTime.options[selectTime.selectedIndex].value);
                                commentActive.data = data;
                                let filtered = filterNgrams(data, 'clean', ngram)
                                dataSerie.data[category].tags.current = ngram;
                                createTags(filtered.data, filtered.tags);
                                onClickFilterEvent(filtered.data);
                                showPage();
                            }, 10);
                        }
                    }
                },
                states: {
                    select: {
                        color: colorSelected
                    },
                    hover: {
                        color: colorSelected
                    }
                }
            }
        },
        legend: {
            enabled: false
        },
        series: [{
            data: Y.slice(0, topn),
            name: 'Quantidade',
            groupPadding: 0.05,
            allowPointSelect: true,
        }]
    }

    return config;
}

function buildHighCharts(idChart, config) {
    config.credits = {
        enabled: false,
    }

    config.exporting = {
        buttons: {
            contextButton: {
                menuItems: ["viewFullscreen", "downloadJPEG", "downloadSVG"]
            }
        }
    }


    Highcharts.setOptions({
        lang: {
            months: [
                'Janeiro', 'Fevereiro', 'Março', 'Abril',
                'Maio', 'Junho', 'Julho', 'Agosto',
                'Setembro', 'Outubro', 'Novembro', 'Dezembro'
            ],
            weekdays: [
                'Dom', 'Seg', 'Ter', 'Qua',
                'Qui', 'Sex', 'Sáb'
            ],
            shortMonths: [
                'Jan', 'Fev', 'Mar', 'Abr',
                'Mai', 'Jun', 'Jul', 'Ago',
                'Set', 'Out', 'Nov', 'Dez'
            ],
            resetZoom: 'Resetar zoom',
            viewFullscreen: 'Vizualizar em Tela Cheia',
            downloadJPEG: 'Download JPEG',
            downloadSVG: "Download SVG"
        }
    })

    return Highcharts.chart(idChart, config);

}

let Bar = ''
let Line = ''

let comments = { negative: '', neutral: '', positive: '' }

let commentActive = { data: '' }

let dataSerie = {
    search: '',
    type: 'negative',
    category: 'tudo',
    groupBy: 'day',
    nGramClicked: '',
    mainSelectLabel: 'Comentários negativos',
    mainData: {},
    data: {}
}

let dict_model = {
    tags: { current: '' },
    data: { negative: '', positive: '' },
    ngram: { negative: '', positive: '' }
}

let dataSerieCategory = {
    type: 'negative',
    groupBy: 'day',
    nGramClicked: '',
    mainSelectLabel: 'Comentários negativos',
    tags: { current: '' },
    data: { negative: '', positive: '' },
    ngram: { negative: '', positive: '' }
}

function extSentences(data, attr) {
    var attr = !!attr ? attr : 'texto'
    let sentences = []
    data.forEach(e => {
        sentences.push(e[attr])
    });
    return sentences;
}

async function startHighCharts() {
    let topn = 15;
    let days = 7; //Intervalo default de 7 dias

    // Emulação - GET em database de comentários;
    // let tableValid = (await getDataCSV(file)).slice(1, -1);

    // Emulação - retorno de submição de comentários a API de análise de comentários
    var data = (await loadJSON('all_reviews.json')).slice(0, -1);

    data.forEach((e, i) => {
        data[i]['date'] = new Date(data[i].date);
    });
    data = sortDate(data, 'date', true);
    dataSerie.mainData['negative'] = data.filter(e => { return e.sent == -1 });
    dataSerie.mainData['positive'] = data.filter(e => { return e.sent == 1 });
    showChart(dataSerie.mainData, days, topn);

};

function showChart(data, days, topn, update) {
    let type = dataSerie.type;
    dataSerie.category = 'semana';
    dataSerie.data['tudo'] = _.cloneDeep(dict_model);
    dataSerie.data.tudo.data = data;
    dataSerie.data.tudo.ngram.negative = getNgrams(data.negative, 2, 15, 'clean');
    dataSerie.data.tudo.ngram.positive = getNgrams(data.positive, 2, 15, 'clean');
    let neg = data.negative.slice(0);
    let pos = data.positive.slice(0);
    let data_interval_neg = neg.length ? getDataIntervalArray(neg, 'date', moment(neg.slice(-1)[0].date).add(-days, 'day'), neg.slice(-1)[0].date) : [];
    let data_interval_pos = pos.length ? getDataIntervalArray(pos, 'date', moment(pos.slice(-1)[0].date).add(-days, 'day'), pos.slice(-1)[0].date) : [];
    dataSerie.data['semana'] = _.cloneDeep(dict_model);
    dataSerie.data.semana.data.negative = data_interval_neg;
    dataSerie.data.semana.data.positive = data_interval_pos;
    dataSerie.data.semana.ngram.negative = getNgrams(data_interval_neg, 2, 15, 'clean');
    dataSerie.data.semana.ngram.positive = getNgrams(data_interval_pos, 2, 15, 'clean');
    let configBar = getConfigHighchartsBar(dataSerie.data.semana.ngram[type].n_gram, dataSerie.data.semana.ngram[type].count, topn);
    let config = getConfigHighchartsLine(dataSerie.data.semana.data[type]);
    if (update) {
        timeBarSetActive('id_time_bar');
        resetSelectChart(Bar);
        Bar.update(configBar)
        Line.zoom();
        Line.update(config);
        onClickFilterEvent(dataSerie.data.semana.data[type]);
        return;
    }
    createTable(dataSerie.data.semana.data[type], 50);
    Bar = buildHighCharts('canvas_bar', configBar);
    Line = buildHighCharts('canvas_line', config);
};


function createTags(data, tags) {
    let category = dataSerie.category
    var sortable = [];
    for (var i in tags) {
        sortable.push([i, tags[i]]);
    }

    sortable.sort(function (a, b) {
        return b[1] - a[1];
    });

    let tags_div = document.querySelector(".tags-container");
    tags_div.innerHTML = '';

    sortable.forEach((e, i) => {
        if (i < 15) {
            let tag = document.createElement("p");
            tag.className = 'badge'
            tag.innerHTML = e[0] + ' <span>' + e[1] + '</span>';
            tags_div.appendChild(tag);
            tag.addEventListener('click', async function (evt) {
                let label = this.textContent.split(' ').slice(0, -1).join(' ');
                let active = document.querySelectorAll("p.badge.active");
                if (active.length) {
                    active[0].className = 'badge'
                }
                this.className = 'badge active'
                let filtered = data.filter(e => {
                    return e.key_words[label] !== undefined;
                })
                onClickFilterEvent(filtered);
            })
        }
    })
}

function clearTags() {
    let category = dataSerie.category;
    dataSerie.data[category].tags.current = '';
    let tags_div = document.querySelector(".tags-container");
    tags_div.innerHTML = '';
}

function createTable(data, max) {

    let table = document.querySelector(".table-comments > tbody");

    function generateTable(table, data, max) {
        for (var i = 0; i < data.length; i++) {
            if (i >= max) return;
            insertData(table, data, i);
        }
        return i;
    }

    function insertData(table, data, i) {
        let line = data[i];
        let row = table.insertRow();
        var cell = row.insertCell();
        let date = document.createTextNode(formatDate(line.date));
        cell.appendChild(date);
        cell = row.insertCell();
        let text = document.createTextNode(line.texto);
        cell.appendChild(text);
    }

    function insertReverse(data, lenTable, max) {

    }

    let lenTable = table.children.length;
    let data_ = data.slice(0).reverse().slice(lenTable, lenTable + max);
    let last = generateTable(table, data_, max)

    var showMore = document.getElementsByClassName("show_more");
    if (data.length > lenTable + last) {
        showMore[0].classList.add("active");
    } else {
        showMore[0].classList.remove("active");
    }

}

function onClickFilterEvent(data, max) {

    var max = !!max ? max : 100;

    function deleteChild() {
        var e = document.querySelector(".table-comments > tbody");
        var first = e.firstElementChild;
        while (first) {
            first.remove();
            first = e.firstElementChild;
        }
    }

    deleteChild()
    createTable(data, max);
    return data;
}

function searchRegexGen(search) {
    let norm = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    let words = norm.split(' ')
    var reg = '\\b' + words[0] + '\\b';
    if (words.length == 1) return reg;
    words.slice(1).forEach(e => {
        reg += '.*\\b' + e + '\\b';
    })
    return reg;
}

function searchData(data, word, attr) {
    var attr = !!attr ? attr : 'clean'
    let re = new RegExp('\\b' + word)
    return data.filter(e => {
        let search = e[attr].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        return re.test(search)
    })
}

function resetSearch(data) {
    let searchInput = document.getElementById('id_search_input');
    searchInput.value = '';
    dataSerie.search = '';
}


function setSelect() {
    dataSerie.nGramClicked = undefined;
    dataSerie.type = dataSerie.type === 'negative' ? 'positive' : 'negative';
    dataSerie.mainSelectLabel = dataSerie.type === 'negative' ? 'Comentários negativos' : 'Comentários positivos';
}

function groupByDate(groupBy) {

    dataSerie.groupBy = groupBy;
    let type = dataSerie.type;
    let category = dataSerie.category
    var data = dataSerie.data[category].data[type];
    if (!!dataSerie.nGramClicked) {
        var ngram = dataSerie.nGramClicked;
    } else {
        var ngram = undefined;
    }

    var data = changeHighchartsLine(data, ngram, groupBy);

    return data
}

function changeTopNgrams(topn) {
    let type = dataSerie.type;
    let category = dataSerie.category
    let nGramActive = dataSerie.data[category].ngram[type];
    changeHighchartsBar(nGramActive.n_gram, nGramActive.count, topn);
}

function loading() {
    var loader = document.getElementsByClassName("loader");
    loader[0].classList.add("show");
    var block = document.getElementsByClassName("loader_block");
    block[0].classList.add("show");
}

function showPage() {
    var main = document.getElementsByClassName("main_container");
    main[0].classList.add("show");
    var loader = document.getElementsByClassName("loader");
    loader[0].classList.remove("show");
    var block = document.getElementsByClassName("loader_block");
    block[0].classList.remove("show");
}

async function changeAllCharts(days, category) {

    setTimeout(() => {
        Line.zoom();
        let type = dataSerie.type;
        dataSerie.nGramClicked = undefined;
        if (category in dataSerie.data) {
        } else {
            dataSerie.data[category] = _.cloneDeep(dict_model);
            let data_neg = dataSerie.data.tudo.data['negative']
            let data_pos = dataSerie.data.tudo.data['positive']
            let neg = data_neg.length ? getDataIntervalArray(data_neg, 'date', moment(data_neg.slice(-1)[0].date).add(-days, 'day'), data_neg.slice(-1)[0].date) : [];
            let pos = data_pos.length ? getDataIntervalArray(data_pos, 'date', moment(data_pos.slice(-1)[0].date).add(-days, 'day'), data_pos.slice(-1)[0].date) : [];
            dataSerie.data[category].data.negative = neg;
            dataSerie.data[category].data.positive = pos;
            dataSerie.data[category].ngram.negative = getNgrams(dataSerie.data[category].data.negative, 2, 15, 'clean');
            dataSerie.data[category].ngram.positive = getNgrams(dataSerie.data[category].data.positive, 2, 15, 'clean');
        }

        changeHighchartsBar(dataSerie.data[category].ngram[type].n_gram, dataSerie.data[category].ngram[type].count, 15);
        changeHighchartsLine(dataSerie.data[category].data[type], undefined, dataSerie.groupBy);
        onClickFilterEvent(dataSerie.data[category].data[type]);
    }, 10);
    setTimeout(() => {
        showPage();
    }, 20);

}

async function searchStart(evt) {

    let search = document.getElementById('id_search_input');

    if (search.value === dataSerie.search) {
        return;
    }

    if (!search.value.trim(' ').length) {
        search.classList.remove("active");
        return;
    } else {
        search.classList.add("active");
    }

    loading();

    setTimeout(() => {
        clearTags();
        let n_gram = search.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        let data = dataSerie.mainData;
        dataSerie.data = {};
        let filtered = { negative: '', positive: '' }
        filtered.negative = searchData(data.negative, n_gram, 'texto');
        filtered.positive = searchData(data.positive, n_gram, 'texto');
        showChart(filtered, 7, 15, true);
        dataSerie.search = search.value;
        showPage();
    }, 10);
}

function timeBarClick(id, className) {
    let dict = {
        'semana': 7,
        'mes': 30,
        'tres_meses': 90,
        'seis_meses': 180,
        'doze_meses': 365,
        'tudo': -1
    }
    var header = document.querySelector(id);
    var div = header.getElementsByClassName(className);
    for (var i = 0; i < div.length; i++) {
        div[i].addEventListener("click", function (evt) {
            loading();
            clearTags();
            var category = this.id.split('_').slice(1).join('_');
            dataSerie.category = category;
            changeAllCharts(dict[category], category);
            var active = header.getElementsByClassName("active");
            active[0].classList.remove("active");
            this.classList.add("active");
        });
    }
}

function timeBarSetActive(id) {
    var timeBar = document.getElementById(id);
    var div = timeBar.getElementsByClassName('active');
    for (var i = 0; i < div.length; i++) {
        div[i].classList.remove("active");
    };
    timeBar.children[0].classList.add('active');
}



let selectComment = document.getElementById('comment_type');
// let selectTopNgrams = document.getElementById('n_gram_top');
let selectTime = document.getElementById('id_time_select');
let home = document.getElementById('id_home');
let searchBtn = document.getElementById('id_search_btn');
let searchInput = document.getElementById('id_search_input');
let hideLabels = document.getElementById('id_disable_labels');
let showMore = document.getElementById('id_show_more');

home.addEventListener('click', async function (evt) {
    resetSearch();
    if (dataSerie.data.tudo.data === dataSerie.mainData) return;
    loading();
    setTimeout(() => {
        clearTags();
        dataSerie.data = {}
        showChart(dataSerie.mainData, 7, 15, true);
        showPage();
    }, 5);
})

searchInput.addEventListener('keydown', async function (evt) {
    if (evt.type === 'keydown' && evt.keyCode != 13) return;
    await searchStart(evt);
})

searchBtn.addEventListener('keydown', async function (evt) {
    await searchStart(evt);
})

searchBtn.addEventListener('click', async function (evt) {
    await searchStart(evt);
})

showMore.addEventListener('click', function (evt) {
    let type = dataSerie.type;
    let category = dataSerie.category;
    let data = dataSerie.data[category].data[type];
    createTable(data, 100);
})

document.addEventListener('click', (evt) => {
    let search = document.getElementById('id_search_input');
    if (search != evt.target && !search.value.length) {
        search.classList.remove("active");
        return;
    }
})

selectComment.addEventListener('change', function (evt) {
    loading();
    setTimeout(() => {
        clearTags();
        setSelect();
        let type = dataSerie.type;
        let category = dataSerie.category
        let nGramActive = dataSerie.data[category].ngram[type];
        let data = dataSerie.data[category].data[type];
        changeHighchartsBar(nGramActive.n_gram, nGramActive.count, 15);
        groupByDate(selectTime.options[selectTime.selectedIndex].value);
        // changeTopNgrams(selectTopNgrams.options[selectTopNgrams.selectedIndex].value);
        onClickFilterEvent(data);
        showPage();
    }, 10);
});

// selectTopNgrams.addEventListener('change', function (evt) {
//     let topn = this.options[this.selectedIndex].value;
//     changeTopNgrams(topn);
// });

selectTime.addEventListener('change', function (evt) {
    loading();
    setTimeout(() => {
        groupByDate(this.options[selectTime.selectedIndex].value);
        showPage()
    }, 5);
});

hideLabels.addEventListener('change', function (evt) {
    let config = {
        plotOptions: {
            line: {
                dataLabels: {
                    enabled: !this.checked
                }
            }
        }
    }
    Line.update(config);
})

window.addEventListener('load', async function (event) {
    await startHighCharts();
    showPage();
    timeBarClick('.time-bar', 'tablinks');
});


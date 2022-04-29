function renderBasicChart(id, chartTitle, chartType, xAxisTitle, yAxisTitle, seriesName, seriesData,xCategory) {
    return Highcharts.chart(id, {
        chart: {
            zoomType: ['x', 'y'],
            type: chartType
        },
        title: {
            text: chartTitle
        },
        plotOptions: {
            series: {
                color: '#00bc8c'
            }
        },
        xAxis: {
            categories: xCategory,
            title: {
                text: xAxisTitle
            }
        },
        yAxis: {
            title: {
                text: yAxisTitle
            }
        },
        credits: {
            enabled: false
        },
        series: [{
            name: seriesName,
            data: seriesData
        }]
    });
}



function renderHeatmap(id, heatmapdata) {
    return Highcharts.chart(id, {
        chart: {
            type: 'heatmap',
            height: 500 + 'px'
        },
        boost: {
            useGPUTranslations: true,
            usePreallocated: true
        },
        title: {
            text: 'Correlation Matrix'
        },
        xAxis: {
            categories: heatmapdata.categories
        },

        yAxis: {
            categories: heatmapdata.column,
            title: null
        },
        credits: {
            enabled: false
        },
        colorAxis: {
            stops: [
                [-1, '#891927'],
                [0.5, '#ffffff'],
                [1, '#00bc8c']
            ],
            min: -1,
            max: 1
        },
        legend: {
            align: 'right',
            layout: 'vertical',
            margin: 0,
            verticalAlign: 'top',
            y: 40,
            symbolHeight: 405
        },
        tooltip: {
            formatter: function () {
                return '<b>' + this.series.yAxis.categories[this.point.y] + '</b> vs <b>' +
                    this.series.xAxis.categories[this.point.x] +
                    '</b> <br><b>' + this.point.value + '</b>';
            }
        },
        plotOptions: {
            series: {
                boostThreshold: 100
            }
        },
        series: [{
            // name: '',
            borderWidth: 1,
            data: heatmapdata.binnedData
            // dataLabels: {
            //     enabled: true,
            //     color: '#000000'
            // }
        }]

    });
}
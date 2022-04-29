const SERVER_IP = "127.0.0.1";
const SERVER_PORT = "7777";
const SERVER_URL = SERVER_IP + ":" + SERVER_PORT;
var request_flag = 0

window.onload = function () {
    // Scroll to top
    document.getElementById("graph").style.display = "none";
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            $('.scroll-top').fadeIn();
        } else {
            $('.scroll-top').fadeOut();
        }
    });

    $('.scroll-top').click(function () {
        $("html, body").animate({
            scrollTop: 0
        }, 100);
        return false;
    });

    $('#graphs').append('<div class="d-flex justify-content-center" id="sentinel"><div class="row"><div class="spinner-border text-success" role="status"><span class="sr-only">Loading...</span></div></div></div>');
    var filename = getUrlVars(window.location.href)["file"];

    var overview_container = '<div class="container  justify-content-center align-items-center" style="padding:5%" id="overviewcontainer" ">\
                                <div class="row justify-content-center align-items-center" style="margin-top: 0px; overflow:hidden;">\
                                    <div class="card border-success" style="width: 100%;">\
                                        <div class="card-body">\
                                        <div class="row">\
                                          <div class="col-sm-3"><h4 class="card-title"><h3>Overview</h3></h4></div>\
                                          </div>\
                                          <div class="row">\
                                              <div class="col-sm-6" id="datasetinfo">\
                                              </div>\
                                              <div class="col-sm-6" id="variabletypes">\
                                              </div>\
                                          </div>\
                                          <div class="row">\
                                          <div class="col text-center"><button type="button" class="btn btn-outline-success" onclick="toggleOverview(1)">Data</button></div>\
                                          </div>\
                                        </div>\
                                      </div>\
                                    </div>\
                                </div>';




    if (!(["csv", "xlsx", "xls"].includes(filename.split('.').pop()))) {
        alert("File type not supported");
        window.location.href = "./index.html";
    }
    else {
        var counter = 0;
        if (sessionStorage.getItem('graph_data' + filename) && sessionStorage.getItem('overview' + filename)) {
            console.log(filename);
            var sentinel = document.querySelector('#sentinel');
            var graph_data = JSON.parse(sessionStorage.getItem('graph_data' + filename));
            var overviewdata = JSON.parse(sessionStorage.getItem('overview' + filename));
            var dataheader = JSON.parse(sessionStorage.getItem('dataheader' + filename));

            $("body").prepend(overview_container);

            for (var key in overviewdata) {
                if (overviewdata.hasOwnProperty(key)) {
                    this.console.log(key);
                    populate_overview_table(key, data = overviewdata[key]);
                }
            }

            populate_data_header_table("headerdata", dataheader);

            for (var key in graph_data) {
                if (graph_data.hasOwnProperty(key)) {
                    renderChart(key, data = graph_data[key]);
                    var count = sessionStorage.getItem('local_count'+filename);
                    var total = sessionStorage.getItem('total_graphs'+filename);
                    if(count == total) sentinel.innerHTML = "No more charts";
                    counter++;
                }
            }

        }
//        else {
            console.log(filename);
            if(!sessionStorage.getItem('overview'+filename)) getOverview(filename, overview_container);
            if(!sessionStorage.getItem('dataheader'+filename))getDataHead(filename);
            var sentinel = document.querySelector('#sentinel');
            // Create a new IntersectionObserver instance
            var intersectionObserver = new IntersectionObserver(entries => {

                if (entries[0].intersectionRatio <= 0) {
                    return;
                }
                if (request_flag == 0) {
                    request_flag = 1;
                    getGraphData(filename, counter);
                    counter = counter + 3;
                }
                else {
                    return;
                }
            });
            intersectionObserver.observe(sentinel);
//        }
    }
  $(document).ready(function(){
      $("#myInput").on("keyup", function() {
        var value = $(this).val().toLowerCase();

        $("#canvas .col-sm-8").filter(function() {
          if($(this).text().toLowerCase().indexOf(value) > -1)
          $(this).parent().show()
          else $(this).parent().hide()

        });
        $("#canvas2 .col-sm-9").filter(function() {
          if($(this).text().toLowerCase().indexOf(value) > -1)
          $(this).parent().show()
          else $(this).parent().hide()

        });


      });
});
}

function getUrlVars(url) {
    var url = url, vars = {};
    url.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        key = decodeURIComponent(key);
        value = decodeURIComponent(value);
        vars[key] = value;
    });
    return vars;
}

function getOverview(filename, overview_container) {
    var xhttp = new XMLHttpRequest();
    var uploadedfilename = new FormData();
    uploadedfilename.append("name", filename);

    xhttp.open("POST", "http://" + SERVER_URL + "/getoverview", true);
    xhttp.withCredentials = true;
    xhttp.send(uploadedfilename);

    xhttp.onreadystatechange = function () {
        if (xhttp.readyState == 4 && (xhttp.status == 200 || xhttp.status == 0)) {
            $("body").prepend(overview_container);
            var response_data = JSON.parse(xhttp.responseText);

            if (response_data.Status == "OK") {
                var overviewdata = response_data.data;
                sessionStorage.setItem('total_graphs'+filename,overviewdata.datasetinfo['Number of variables']+1);
                sessionStorage.setItem("overview" + filename, JSON.stringify(overviewdata));

                for (var key in overviewdata) {
                    if (overviewdata.hasOwnProperty(key)) {
                        populate_overview_table(key, data = overviewdata[key]);
                    }
                }
            }
            else {
                alert("File not found");
                window.location.href = "./index.html";
            }
        }
    }
}

function getDataHead(filename) {
    console.log("head called");
    var xhttp = new XMLHttpRequest();
    var uploadedfilename = new FormData();
    uploadedfilename.append("name", filename);

    xhttp.open("POST", "http://" + SERVER_URL + "/getdatahead", true);
    xhttp.withCredentials = true;
    xhttp.send(uploadedfilename);

    xhttp.onreadystatechange = function () {
        if (xhttp.readyState == 4 && (xhttp.status == 200 || xhttp.status == 0)) {
            // $("body").prepend(overview_container);
            var dataheader = JSON.parse(xhttp.responseText.replace(/\bNaN\b/g, "null"));
            console.log(dataheader);

            if (dataheader) {
                sessionStorage.setItem("dataheader" + filename, JSON.stringify(dataheader));
                populate_data_header_table("headerdata", dataheader);
            }
            else {
                alert("File not found");
                window.location.href = "./index.html";
            }
        }
    }
}

function getGraphData(filename, counter) {
    var xhttp = new XMLHttpRequest();
    var uploadedfilename = new FormData();

    uploadedfilename.append("name", filename);
    uploadedfilename.append("counter", counter);

    xhttp.open("POST", "http://" + SERVER_URL + "/getgraphdata", true);
    xhttp.withCredentials = true;
    xhttp.send(uploadedfilename);

    xhttp.onreadystatechange = function () {
        if (xhttp.readyState == 4 && (xhttp.status == 200)) {
            request_flag = 0;

            var response_data = JSON.parse(xhttp.responseText);

            if (response_data.Status == "OK") {
                if (response_data["No more charts"]) {
                    sentinel.innerHTML = "No more charts";
                    request_flag = 1
                    return;
                }
                var graph_data = response_data.data;

                for (var key in graph_data) {
                    if (graph_data.hasOwnProperty(key)) {
                        addTosessionStorageObject('graph_data' + filename, key, graph_data[key]);
                        renderChart(key, data = graph_data[key]);
                    }
                }
                sessionStorage.setItem('local_count'+filename,Object.keys(JSON.parse(sessionStorage.getItem('graph_data'+filename))).length);
                if (response_data["end"]) {
                    sentinel.innerHTML = "No more charts";
                    request_flag = 1
                    return;
                }
            }
            else {
                alert("File not found");
                window.location.href = "./index.html";
            }
        }
    }
}

function get_bivariatedata(id,filename, xdata, ydata){
    var sentinel = document.querySelector('#sentinelbiv');
    var dataToSend = new FormData();
    dataToSend.append("filename", filename);
	dataToSend.append("xdata", xdata );
	dataToSend.append("ydata", ydata );
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
    if (xhttp.readyState == 4 && (xhttp.status == 200 || xhttp.status == 0)) {
        var response_data = JSON.parse(xhttp.responseText);

        if (response_data.Status == "OK") {
            var graph_data = response_data.data;
            if (response_data.graph == "scatter"){
                    var chart = renderBasicChart(id='graph-'+id,chartTitle= 'Relation between ' + xdata + ' and ' + ydata,chartType= response_data.graph,xAxisTitle= xdata,yAxisTitle= ydata,seriesName='',seriesData= graph_data);
                    chart.update({
                        plotOptions: {
                            scatter: {
                                marker: {
                                    radius: 5,
                                    states: {
                                        hover: {
                                            enabled: true,
                                            lineColor: 'rgb(100,100,100)'
                                        }
                                    }
                                },
                                states: {
                                    hover: {
                                        marker: {
                                            enabled: false
                                        }
                                    }
                                },
                                tooltip: {
                                    // headerFormat: '<b>{series.name}</b><br>',
                                    pointFormat: '{point.x}, {point.y} '
                                }
                            }
                        }
                    });
                    sentinel.innerHTML = "";

            }
            else if(response_data.graph == "boxplot"){
                renderBasicChart(id='graph-'+id,chartTitle='Relation between ' + xdata + ' and ' + ydata,chartType=response_data.graph,xAxisTitle= response_data.xcol,yAxisTitle= response_data.ycol,seriesName='',seriesData= graph_data,xCategory=response_data.xvalues);
                sentinel.innerHTML = "";
            }

            else if(response_data.graph == "Heatmap"){
                var chart = renderHeatmap('graph-'+id,graph_data);
                chart.update({
                    title: {
                        text: 'Relation between ' + xdata + ' and ' + ydata
                    },
                    legend: {
                      itemHoverStyle: {
                        color: "#0089c4"
                      },
                      itemStyle: {
                        color: "#666666"
                      },
                      shadow: true,
                      y: 10,
                      align: "right",
                      layout: "vertical",
                      verticalAlign: "middle",
                      symbolHeight: 230,
                      symbolWidth: 30,
                      margin: 0
                    }

                });
                sentinel.innerHTML = "";
            }

        }

        else {
            // $("#errormodal").modal();
            alert("File not found");
            window.location.href = "./index.html";
            }
        }
    }
    xhttp.onerror = function() { // only triggers if the request couldn't be made at all
      sentinel.innerHTML = "This graph cannot be made!";
    };
    xhttp.open("POST", "http://" + SERVER_URL + "/getbivariatedata", true);
    xhttp.send(dataToSend);
}


function addTosessionStorageObject(name, key, value) {
    // Get the existing data
    var existing = sessionStorage.getItem(name);
    // If no existing data, create an array
    // Otherwise, convert the sessionStorage string to an array
    existing = existing ? JSON.parse(existing) : {};
    // Add new data to sessionStorage Array
    existing[key] = value;
    // Save back to sessionStorage
    sessionStorage.setItem(name, JSON.stringify(existing));
};

function dictToArray(dict) {
    // Convert dictionary to array of array
    var array = [];
    for (var i in dict) {
        array.push([i, dict[i]]);
    }
    return array;
}
function removeRow(id){
    var row = document.querySelector('#row-'+id);
    row.remove();
}



function addRow(){
    var id = Math.random().toString(36).substr(2, 5);
    $('#canvas2').append("<div class='row' id='row-" + id + "' style='position:relative; background-color:#2B2B2B;border-radius:15px;padding:3%'></div>");
    $('#row-' + id).append("<div class='col-sm-3' id='form-"+id+"'></div><div class='col-sm-9' style='height:20%;' id='graph-"+id+"'></div><button style='position:absolute;top:15px;right:15px;border-radius:50%;width:25px;height:25px;align-item:center;background-color:rgb(0, 188, 140);color:#303030;' onclick='removeRow(`"+id+"`)'>x</button>");
    $('#form-'+id).append("<div>\
      <form id='graphForm"+id+"'>\
        <label>Select X axis column</label>\
        <select id='xList"+id+"' style='background-color: #202020;border-radius:10px;padding:2%; '>\
        </select>\
        <br>\
        <label>Select Y axis column</label>\
        <select id='yList"+id+"' style='background-color: #202020;border-radius:10px;padding:2%;'>\
        </select>\
        <br>\
        <input type='submit' value='Submit' style='background-color: rgb(0, 188, 140);border-radius:10px;margin:4%;'>\
      </form>\
    </div>");
    window.scrollTo(0,document.body.scrollHeight);
    get_columnnames(id);
    $("#graphForm"+id).submit(function(event){
        event.preventDefault(); //prevent default action
        // console.log(getUrlVars(window.location.href)["file"])
        if(!document.querySelector('#sentinelbiv'))
        $('#graph-'+id).append('<div class="d-flex justify-content-center" id="sentinelbiv"><div class="row"><div class="spinner-border text-success" role="status"><span class="sr-only">Loading...</span></div></div></div>');
        else{
            var sentinel = document.querySelector('#sentinelbiv');
            sentinel.innerHTML = "";
            sentinel.innerHTML = '<div class="row"><div class="spinner-border text-success" role="status"><span class="sr-only">Loading...</span></div></div>';
        }
        var filename = getUrlVars(window.location.href)["file"];
        var xdata = $("#xList"+id).val()
        var ydata = $("#yList"+id).val()
        get_bivariatedata(id,filename, xdata, ydata);
        })


}

function renderChart(id, data) {
    if (data.type != "heatmap") {
        // if not heatmap add div for chart and table
        $('#canvas').append("<div class='row' id='row-" + id + "'><div class='col-sm-8' id=" + id + "></div></div>");
        $('#row-' + id).append("<div class='col-sm-4'><table id='table-" + id + "' class='tablea' width='100%' style=background-color:#303030;></table></div>");

        if (data.tooltip_range) {
            // Histogram and Line chart
            var tooltip_range = data.tooltip_range;

            var chart = renderBasicChart(id,
                chartTitle = data.column,
                chartType = data.type,
                xAxisTitle = data.column,
                yAxisTitle = 'Frequency',
                seriesName = 'Distribution',
                seriesData = data.binnedData);

            chart.update({
                tooltip: {
                    formatter: function () {
                        return '<b>' + tooltip_range[this.series.xData.indexOf(this.x)] + '</b><br/><b>Frequency: ' + this.y + '</b>';
                    }
                },
                plotOptions: {
                    series: {
                        pointPadding: 0,
                        groupPadding: 0,
                        borderWidth: 0,
                        color: '#00bc8c'
                    }
                }
            });
        }
        else {
            // column charts
            var array_data = dictToArray(data.binnedData);

            var chart = renderBasicChart(id,
                chartTitle = data.column,
                chartType = data.type,
                xAxisTitle = data.column,
                yAxisTitle = 'Frequency',
                seriesName = 'Distribution',
                seriesData = array_data);

            chart.xAxis[0].setCategories(data.categories);
        }
        // Analysis table
        $(document).ready(function () {
            $('#table-' + id).DataTable({
                data: dictToArray(data.analysis),
                columns: [{ title: "Statistics" }, { title: "Value" }],
                "autoWidth": false,
                "bLengthChange": false,
                "pagingType": "simple",
                "filter": false,
                "info": false,
                "ordering": false
            });
        });

    }
    else {
        // Heatmap
        $('#canvas').append("<div class='row' id='row-" + id + "'><div class='col-sm-12' id=" + id + "></div></div>");
        var chart = renderHeatmap(id, data);
    }
}


function populate_overview_table(id, data) {
    $('#' + id).append("<table id='table-" + id + "' class='table table-noborder' width='100%' style=background-color:#303030;></table>");

    if (id == "datasetinfo") { var title = "<h4>Dataset info</h4>" } else { var title = "<h4>Variable types</h4>" }

    $(document).ready(function () {
        $('#table-' + id).DataTable({
            data: dictToArray(data),
            columns: [{ title: title }, { title: "" }],
            "autoWidth": false,
            "bLengthChange": false,
            "paging": false,
            "filter": false,
            "info": false,
            "ordering": false
        });
    });
}

function populate_data_header_table(id, data) {
    $('#' + id).append("<table id='table-" + id + "' class='table table-noborder' width='100%' style=background-color:#303030;></table>");

    $(document).ready(function () {
        $('#table-' + id).DataTable({
            data: data.data,
            columns: data.coldefs,
            "bLengthChange": false,
            "scrollX": true,
            "paging": false,
            "filter": false,
            "info": false,
            "ordering": false
        });
    });
}
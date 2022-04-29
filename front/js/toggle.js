function toggleView(state) {
    var a = document.getElementById('radio-a');
    var b = document.getElementById('radio-b');
    if (state == 0) {
        console.log("eda");
        a.checked = true;
        b.checked = false;
        document.getElementById("graphs").style.display = "block";
        document.getElementById("note").style.display = "block";
        document.getElementById("graph").style.display = "none";
    } else {
        console.log("own")
        a.checked = false;
        b.checked = true;
        document.getElementById("graphs").style.display = "none";
        document.getElementById("note").style.display = "none";
        document.getElementById("graph").style.display = "block";
    }
}

function toggleOverview(state) {
    if (state == 0) {
        console.log("overview");
        document.getElementById("overviewcontainer").style.display = "block";
        document.getElementById("overviewdatacontainer").style.display = "none";
    } else {
        console.log("data")
        
        document.getElementById("overviewcontainer").style.display = "none";
        document.getElementById("overviewdatacontainer").style.display = "block";
        var table = $("#table-headerdata").DataTable();
        table.columns.adjust().draw();
    }
}

function get_columnnames(id){
        var filename = getUrlVars(window.location.href)["file"];
        var xhttp = new XMLHttpRequest();
        var uploadedfilename = new FormData();
        uploadedfilename.append("filename", filename);

        xhttp.onreadystatechange = function () {
            if (xhttp.readyState == 4 && (xhttp.status == 200 || xhttp.status == 0)) {
                var response_data = JSON.parse(xhttp.responseText);
                if (response_data.Status == "OK") {
                        var select = document.getElementById("xList"+id);
                        select.innerHTML = "";
                        for(var i = 0; i <  response_data.num_columns; i++) {
                            // console.log(i);
                            var opt = response_data.columns[i];
                            // console.log(opt);
                            select.innerHTML += "<option value=\"" + opt + "\">" + opt + "</option>";
                        }
                        var select = document.getElementById("yList"+id);
                        select.innerHTML = "";
                        for(var i = 0; i < response_data.num_columns; i++) {
                            var opt = response_data.columns[i];
                            select.innerHTML += "<option value=\"" + opt + "\">" + opt + "</option>";
                        }
                    }
                }
            }

        xhttp.open("POST", "http://" + SERVER_URL + "/getcolumnames", true);
        xhttp.withCredentials = true;
        xhttp.send(uploadedfilename);
}
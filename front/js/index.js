const SERVER_IP = "127.0.0.1";
const SERVER_PORT = "7777"
const SERVER_URL = SERVER_IP + ":" + SERVER_PORT;

window.onload = function () {
    $('input').change(function () {
        document.getElementById("subfilename").style.border = "1px solid";
        document.getElementById("uploadbutton").style.border = "1px solid";
        $('label').text(document.getElementById("dataFileId").files[0].name);
    });
}

function uploadfile() {
    
    console.log("get");
    var dataFile = document.getElementById("dataFileId").files;
    console.log("after get");
    if (dataFile.length == 0) {
        document.getElementById("subfilename").style.borderColor = "red";
        document.getElementById("uploadbutton").style.borderColor = "red";
        $('label').text("No file selected.....");
    }
    else if (!(["csv", "xlsx", "xls"].includes(dataFile[0].name.split('.').pop()))) {
        console.log("file type");
        alert("File type not supported");
    }
    else {
        $('.input-group-text').prop('disabled', true); // disale button on click

        $(".container").append('<div class="row"><div class="col-8 offset-2"><div class="progress"><div class="progress-bar bg-success" role="progressbar" aria-valuemin="0" aria-valuemax="100" style="width: 0%"></div></div></div></div>');
        console.log("data[0]");
        file_binary = dataFile[0];
        console.log("after data[0]");

        var dec2hex = function(dec) {
            return ('0' + dec.toString(16)).substr(-2)
          };
          
          // generateId :: Integer -> String
          var generateFileName = function(len) {
            var arr = new Uint8Array((len || 40) / 2)
            window.crypto.getRandomValues(arr)
            return Array.from(arr, dec2hex).join('')
          };

        var updateProgressBar = function (percent) {
            var bar = $(".progress-bar");
            bar.attr("aria-valuenow", percent);
            bar.css("width", percent + "%");
        };
        var onProgress = function (e) {
            if (e.lengthComputable) {
                var percentComplete = (e.loaded / e.total) * 100;
                updateProgressBar(percentComplete);
            }
        };

        var xhttp = new XMLHttpRequest();
            var data = new FormData();

            var filename = generateFileName(20) + '.'+ dataFile[0].name.split('.').pop()
            console.log(filename)

            data.append("file", file_binary, filename);

            xhttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {


                    ret = JSON.parse(this.responseText);

                    if (ret.Success) {
                        window.location.href = "./graphs.html?file=" + filename;
                    }
                    else {
                        alert("Problem uploading file");
                    }
                }
            };
            xhttp.open("POST", "http://" + SERVER_URL + "/uploadcsv", true);
            xhttp.upload.addEventListener('progress', onProgress, false);
            xhttp.withCredentials = true;
            xhttp.send(data);
    }
}
import json
from os import path
import os
import io
import pickle

import pandas as pd
import numpy as np

from flask import Flask
from flask import jsonify
from flask import request
from flask import session
#from flask_session import Session
from flask_cors import CORS
from werkzeug import secure_filename
import calculations as cal

app = Flask(__name__)
app.config.from_object('config')
CORS(app, supports_credentials=True)

class vars(object):
    unwanted_columns_list = set()  # need to remove constant and blank columns for plotting heat map


ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def percentile(n):
    def percentile_(x):
        return np.percentile(x, n)

    percentile_.__name__ = 'percentile_%s' % n
    return percentile_

def read_file(filename, filepath):
    ext = filename.rsplit('.', 1)[1].lower()
    if ext == "csv":
        return pd.read_csv(filepath) #, encoding = "ISO-8859-1") #, header =0,  encoding = 'unicode_escape')
    else:
        return pd.read_excel(filepath) #, encoding = "ISO-8859-1") #, header = 0, encoding = 'unicode_escape')


@app.route('/uploadcsv', methods=['POST'])
def uploadCsv():
    data_file = request.files['file']
    filename = secure_filename(data_file.filename)

    if data_file and allowed_file(filename):
        filepath = path.join(app.config['UPLOAD_FOLDER'], filename)

        picklefilename = filename.rsplit('.', 1)[0]
        picklepath = path.join(app.config['UPLOAD_FOLDER'], picklefilename)

        data_file.save(filepath)
        data = read_file(filename, filepath)

        session[filename + "num_vars"] = int(len(data.columns))
        session[filename + "columns"] = data.columns.tolist()
        session[filename + "Number of variables"] = int(len(data.columns))
        session[filename + "Number of observations"] = int(len(data))
        session[filename + "Missing cells"] = int(data.isna().sum().sum())
        session[filename + "Duplicate rows"] = int(sum(data.duplicated()))

        counts_variables_dict, Col_names_each_types_var_dict = cal.get_variable_types(data)

        session[filename + "variabletypes"] = counts_variables_dict
        session[filename + "variablenames"] = Col_names_each_types_var_dict
        with open(picklepath, 'wb') as file:
            pickle.dump(data, file)
            file.close()
        os.remove(app.config['UPLOAD_FOLDER'] + filename)

        return jsonify(Success=True)
    else:
        return jsonify(Success=False)


@app.route('/getcolumnames', methods=['POST'])
def getColumnNames():
    filename = request.form['filename']
    print(filename)

    json_obj = {}
    json_obj["Status"] = "OK"
    json_obj["num_columns"] = session[filename + "num_vars"]
    json_obj["columns"] = session[filename + "columns"]

    return json.dumps(json_obj)



@app.route('/getbivariatedata', methods=['POST'])
def getBivariatedata():
    filename = request.form['filename']
    xdata = request.form['xdata']
    ydata = request.form['ydata']
    picklefilename = filename.rsplit('.', 1)[0]
    picklepath = path.join(app.config['UPLOAD_FOLDER'], picklefilename)
    if path.isfile(picklepath):
        with open(picklepath, 'rb') as file:
            data = pickle.load(file)
            file.close()
            if xdata == ydata:
                data[xdata].dropna()

            else:
                data = data[[xdata,ydata]]
                data = data.dropna(how='any', axis=0)
            json_obj = {}
            json_obj["Status"] = "OK"
            json_obj["data"] = {}
            json_obj["xcol"] = xdata
            json_obj["ycol"] = ydata

        if (((data[xdata].dtype == np.int64) | (data[xdata].dtype == np.float64))
                & ((data[ydata].dtype == np.int64) | (data[ydata].dtype == np.float64))):

            json_obj["graph"] = "scatter"
            json_obj["data"] = np.vstack(
                (data[xdata].values.astype(np.int64), data[ydata].values.astype(np.int64))).T.tolist()
            return json.dumps(json_obj)

        elif ((data[xdata].dtype == np.object) & (data[ydata].dtype == np.object)):
            json_obj["graph"] = "Heatmap"
            json_obj["data"]["categories"] = {}
            json_obj["data"]["column"] = {}
            json_obj["data"]["binnedData"] = {}
            xvalues, yvalues, maindata = cal.heatMapDatabivariate(xdata, ydata, data)

            json_obj["data"]["categories"] = xvalues
            json_obj["data"]["column"] = yvalues
            json_obj["data"]["binnedData"] = maindata
            return json.dumps(json_obj)
        else:
            json_obj["graph"] = "boxplot"
            json_obj["xvalues"] = {}
            json_obj["yvalues"] = {}
            if data[xdata].dtype == np.object:
                json_obj["xvalues"] = data[xdata].unique().tolist()
                json_obj["yvalues"] = data[ydata].unique().tolist()
                json_obj["data"] = np.round(data.groupby(xdata).agg({ydata: [min, percentile(25),
                                                                             percentile(50), percentile(75), max]}),
                                            0).values.tolist()
            elif data[ydata].dtype == np.object:
                json_obj["xcol"] = data[ydata].name
                json_obj["ycol"] = data[xdata].name
                json_obj["xvalues"] = data[ydata].unique().tolist()
                json_obj["yvalues"] = data[xdata].unique().tolist()
                json_obj["data"] = np.round(data.groupby(ydata).agg({xdata: [min, percentile(25),
                                                                             percentile(50), percentile(75), max]}),
                                            0).values.tolist()

            return json.dumps(json_obj)


@app.route('/getgraphdata', methods=['POST'])
def getGraphData():
    filename = request.form['name']
    counter = int(request.form['counter'])
    start = counter
    end = counter + app.config['NUM_CHARTS_PER_CALL']

    picklefilename = filename.rsplit('.', 1)[0]
    picklepath = path.join(app.config['UPLOAD_FOLDER'], picklefilename)

    if path.isfile(picklepath):
        json_obj = {}
        json_obj["end"] = 0
        if (counter > session[filename + "num_vars"]):
            json_obj["Status"] = "OK"
            json_obj["No more charts"] = 1
            return json.dumps(json_obj)

        if (end > session[filename + "num_vars"]):
            end = session[filename + "num_vars"]
            json_obj["end"] = 1

        with open(picklepath, 'rb') as file:
            df = pickle.load(file).iloc[:, range(start, end)]
            file.close()

        json_obj["Status"] = "OK"

        json_obj["num_graphs"] = ((end - start) + 1) if json_obj["end"] else counter

        json_obj["data"] = {}

        def addJsonData(i, chart_type, categories, col, jsondata, tooltip_range, analysis):
            json_obj["data"][f"chart{i}"] = {}
            json_obj["data"][f"chart{i}"]["type"] = chart_type
            json_obj["data"][f"chart{i}"]["categories"] = categories
            json_obj["data"][f"chart{i}"]["column"] = col
            json_obj["data"][f"chart{i}"]["binnedData"] = jsondata
            json_obj["data"][f"chart{i}"]["tooltip_range"] = tooltip_range
            json_obj["data"][f"chart{i}"]["analysis"] = analysis

        for j, (pd_inferred_type, col) in enumerate(zip(df.dtypes, df.columns)):
            i = j + counter
            if (pd_inferred_type == "int64") | (pd_inferred_type == "float64"):
                dataseries = df[col]
                if len(cal.get_non_nan_data(dataseries)):  # ignore blank column
                    binned_data, tooltip_range, chart_type, analysis, is_unwanted = cal.binnedData(dataseries)
                    addJsonData(i, chart_type, "none", col, binned_data, tooltip_range, analysis)
                    if is_unwanted: vars.unwanted_columns_list.update([col])
                else:
                    vars.unwanted_columns_list.update([col])
            else:
                analysis, data, x_axis_categories, is_unwanted = cal.otherdata(df[col])
                addJsonData(i, "column", x_axis_categories, col, data, 0, analysis)
                vars.unwanted_columns_list.update([col])  # need to change this, for now we are ignoring
                # object type for correlation, will use some
                # different technique for categorical data.

        if (json_obj["end"]):
            heatmap_columns = [column for column in session[filename + "columns"] if
                               column not in vars.unwanted_columns_list]

            if (len(heatmap_columns) > 1):
                # categories, col, corr_data = cal.heatMapData(read_file(filename, filepath, columns = heatmap_columns))
                with open(picklepath, 'rb') as file:
                    df = pickle.load(file).loc[:, heatmap_columns]
                    file.close()
                categories, col, corr_data = cal.heatMapData(df)
                addJsonData(session[filename + "num_vars"], "heatmap", categories, col, corr_data, "none", "none")

        return json.dumps(json_obj)
    else:
        return (json.dumps({"Status": "File not found"}))


@app.route('/getoverview', methods=['POST'])
def getOverview():
    filename = request.form['name']

    picklefilename = filename.rsplit('.', 1)[0]
    picklepath = path.join(app.config['UPLOAD_FOLDER'], picklefilename)

    if path.isfile(picklepath):

        json_obj = {}
        json_obj["Status"] = "OK"
        json_obj["data"] = {}
        json_obj["data"]["datasetinfo"] = {}
        json_obj["data"]["datasetinfo"]["Number of variables"] = session[filename + "Number of variables"]
        json_obj["data"]["datasetinfo"]["Number of observations"] = session[filename + "Number of observations"]
        json_obj["data"]["datasetinfo"]["Missing cells"] = session[filename + "Missing cells"]
        json_obj["data"]["datasetinfo"]["Duplicate rows"] = session[filename + "Duplicate rows"]
        json_obj["data"]["variabletypes"] = session[filename + "variabletypes"]
        json_obj["data"]["variablenames"] = session[filename + "variablenames"]

        return json.dumps(json_obj)
    else:
        return (json.dumps({"Status": "File not found"}))


@app.route("/getdatahead", methods=['POST'])
def getDataHead():
    filename = request.form['name']
    # filepath = app.config['UPLOAD_FOLDER'] + filename

    picklefilename = filename.rsplit('.', 1)[0]
    picklepath = path.join(app.config['UPLOAD_FOLDER'], picklefilename)

    if path.isfile(picklepath):
        headdata = {}
        # df = read_file(filename, filepath, "head")
        with open(picklepath, 'rb') as file:
            df = pickle.load(file).head()
            file.close()
        coldefs = []
        for col in df.columns:
            coldefs = coldefs + [{"title": col}]

        headdata["coldefs"] = coldefs
        headdata["data"] = df.to_numpy().tolist()
        return jsonify(headdata)

@app.route('/health')
def health():
   return "OK"


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=app.config['PORT_ID'])
    # app.run(host='0.0.0.0', port=app.config['PORT_ID'], ssl_context=('localhost+2.pem', 'localhost+2-key.pem'))

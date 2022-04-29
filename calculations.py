import sys
from urllib.parse import urlparse
import pandas as pd
import numpy as np
from pathlib import Path


def get_blank_count(data):
    return int(data.isnull().sum(axis=0))


def get_data_size(data):
    return int(data.size)


def get_unique_count(data):
    return int(data.unique().size)


def get_non_nan_data(data):
    # return data[~np.isnan(data)]
    return data[~data.isnull()]


#######################################################################################
"""
Number of bins
"""


def get_pro(number_of_datapoints):
    proportion = np.power(number_of_datapoints, -(1 / 3))
    # print(f'proportion - {proportion}')
    return proportion


def get_iqr(data):
    iqr = np.subtract(*np.percentile(data, [75, 25], interpolation='higher'))
    # print(f'iqr {iqr}')
    return iqr


def get_range(data):
    maximum = data.max()
    minimum = data.min()
    range_ = np.round((maximum - minimum))
    # print(f'range {range_}')
    return range_


def get_bins(data, number_of_datapoints):
    range_ = get_range(data)
    iqr = get_iqr(data)
    proportion = get_pro(number_of_datapoints)
    num_bins = range_ / (2 * iqr * proportion)  # Freedman-Diaconis’s Rule
    # print(f'num_bins - {num_bins}')
    return num_bins


# check the missing percentage
########################################################################################
def applyForChageIfNum(str1):
    try:
        no = float(str1)
    except:
        no = np.NAN
    return no


def chageIfNum(mySer):
    # input     :     pd.Series
    # output    :     pd.Series, float
    # explanation:    checks if changing column from string to number has
    #                 >= 95% of convert rate. If yes it converts str column to
    #                 numeric

    mySer1 = mySer.dropna()
    len_mySer = len(mySer1)
    tempSer = mySer.apply(applyForChageIfNum)
    convertRate = len(tempSer[np.isnan(tempSer)]) / len_mySer
    if (len(tempSer[np.isnan(tempSer)]) / len_mySer <= 0.05):
        mySer = tempSer
        convertRate = len(tempSer[np.isnan(tempSer)]) / len_mySer
    return (mySer, convertRate)


#########################################################################################


def binnedData(data, num_bins=-1):
    number_of_datapoints = get_data_size(data)
    num_zeros = int(data.size - data.astype(bool).sum(axis=0))
    num_blank = get_blank_count(data)
    data = get_non_nan_data(data)  # remove null values before plotting
    # if len(data) <= 0: # empty column
    #     return [],[],"",{}, 1

    analysis = {}
    analysis["data type"] = str(data.dtype)
    analysis["zeros"] = num_zeros
    analysis["blank"] = num_blank
    analysis["count"] = get_data_size(data)
    analysis["unique"] = get_unique_count(data)
    is_unwanted = 1 if analysis["unique"] == 1 else 0  # check if constant column - for heatmap
    # print(is_unwanted)
    analysis["mean"] = np.around(np.mean(data), decimals=2)
    analysis["range"] = "{} - {}".format(data.min(), data.max())
    analysis["Q1"] = int(np.percentile(data, 25))
    analysis["median"] = int(np.percentile(data, 50))
    analysis["Q3"] = int(np.percentile(data, 75))
    analysis["95thperc"] = int(data.quantile(0.95))

    number_of_datapoints = data.size
    if (len(data.unique()) > 50):
        if (num_bins == -1):
            num_bins = get_bins(data, number_of_datapoints)
            if ((num_bins == float("inf")) | (num_bins == float("-inf")) | (num_bins <= 0) | (
                    num_bins > number_of_datapoints)):
                num_bins = 50
        freq, bins = np.histogram(data, int(num_bins))
        bins = np.around(bins, decimals=3)
        freq = np.reshape(freq, (-1, 1))
        avg_bin = np.reshape(np.convolve(bins, np.ones(2, ) / 2, mode='valid'),
                             (-1, 1))  # get the mid point of each bin
        tooltip_range = [f'{a} - {b}' for a, b in zip(bins, bins[1:])]
        binned_data = np.concatenate((avg_bin, freq), axis=1)
        return binned_data.tolist(), tooltip_range, 'column', analysis, is_unwanted
    else:
        binned_data = data.value_counts(sort=False).sort_index().reset_index().to_numpy()
        binned_data = np.around(binned_data, decimals=3)
        tooltip = binned_data[:, 0]
        return binned_data.tolist(), tooltip.tolist(), 'line', analysis, is_unwanted


def otherdata(data):
    num_blank = get_blank_count(data)
    data = get_non_nan_data(data)
    analysis = {}
    analysis["data type"] = str(data.dtype)
    analysis["blank"] = num_blank
    num_unique = get_unique_count(data)
    is_unwanted = 1 if num_unique == 1 else 0  # check if constant column - for heatmap
    # print(is_unwanted)
    data,covertRate = chageIfNum(data)
    if (covertRate*100) < 5:
        analysis["mixing"] = str(covertRate*100) + '%'
    analysis["unique"] = num_unique
    analysis["count"] = get_data_size(data)
    unique_count = list(data.value_counts())
    unique_value = data.unique()
    value = {}

    if num_unique >= 5:
        num_unique = 5
    for i in range(num_unique):
        value["{}".format(unique_value[i])] = unique_count[i]
    # print(unique_value[0:num_unique])
    x_axis_categories = unique_value[
                        0:num_unique].tolist()  # tolist() solve "bool_ not JSON serializable" error python bool -> [True, False] JSON bool -> [true, false]
    # print(x_axis_categories)
    return analysis, value, x_axis_categories, is_unwanted


def heatMapData(data):
    corr = data.corr()
    y = corr.index.tolist()
    x = corr.columns.tolist()
    heat_map_matrix_highcharts_format = [list(i) + [val] for i, val in
                                         np.ndenumerate(np.around(corr.to_numpy(), decimals=2))]
    return x, y, heat_map_matrix_highcharts_format


def heatMapDatabivariate(xtab, ytab, data):
    # print(xtab)
    a = data.groupby([xtab, ytab]).size()
    # print(a)
    a = a.to_frame().reset_index()
    # print(a)
    a = a.set_index([xtab, ytab]).unstack(1)
    # print(a)
    a = a.replace(np.nan, 0)
    x = list(data[xtab].unique())
    y = list(data[ytab].unique())
    heat_map_matrix_highcharts_format = [list(i) + [val] for i, val in np.ndenumerate(np.around(a, decimals=2))]
    return x, y, heat_map_matrix_highcharts_format


#####################################################################################################


#####################################################################################################
""" Method for finding variable type """


def update_count_dict(count_dict, variable_type, col_names_dict, var):
    count_dict[variable_type] = count_dict.setdefault(variable_type, 0) + 1
    col_names_dict[variable_type + ' names'] = col_names_dict.setdefault(variable_type + ' names', []) + [var]


def is_boolean_string(unique_series):
    unique_values = [str(value).lower() for value in unique_series]
    accepted_combinations = [["y", "n"],
                             ["yes", "no"],
                             ["true", "false"],
                             ["t", "f"]]

    if any([unique_values == bools for bools in accepted_combinations]):
        return True

    return False


def is_date_or_string(unique_series, number_unique_value):
    try:
        pd.to_datetime(unique_series)
        if number_unique_value == 1:
            return "Constant date"
        else:
            return "Dates"
    except:
        if number_unique_value == 1:
            return "Constant string"
        else:
            return "Strings"


def cat_or_num(unique_series, number_unique_value):
    pass


def is_boolean_number(unique_series):
    return np.array_equal(unique_series, unique_series.astype(bool))


def get_unique_series(series):
    return pd.unique(series[~pd.isna(series)])


def get_init_data(df, index):
    subsetted_series = df.iloc[:, index]
    unique_series = get_unique_series(subsetted_series)
    number_unique_value = len(unique_series)
    return unique_series, number_unique_value


def classify_object_variable(unique_series, number_unique_value):
    if (number_unique_value == 2):
        if is_boolean_string(unique_series):
            return "Boolean"
        else:
            return is_date_or_string(unique_series, number_unique_value)
    else:
        return is_date_or_string(unique_series, number_unique_value)


def classify_numeric_variable(unique_series, number_unique_value):
    if number_unique_value == 0:
        return "Blank"

    elif number_unique_value == 1:
        return "Constant number"

    elif number_unique_value == 2:
        if is_boolean_number(unique_series):
            return "Boolean"

        else:
            return "Numbers"
    #             cat_or_num(subsetted_series, unique_series, number_unique_value)
    else:
        return "Numbers"


#         cat_or_num(subsetted_series, unique_series, number_unique_value)

def get_variable_types(df):
    # data_size = len(df)
    count_dict = {}
    col_names_dict = {}

    for index, (pd_inferred_type, column_name) in enumerate(zip(df.dtypes, df.columns)):

        unique_series, number_unique_value = get_init_data(df, index)
        var = str(pd_inferred_type)

        if ('int' in var) | ('float' in var):
            variable_type = classify_numeric_variable(unique_series, number_unique_value)
            update_count_dict(count_dict, variable_type, col_names_dict, column_name)

        elif 'object' in var:
            variable_type = classify_object_variable(unique_series, number_unique_value)
            update_count_dict(count_dict, variable_type, col_names_dict, column_name)

        elif 'date' in var:
            variable_type = is_date_or_string(unique_series, number_unique_value)
            update_count_dict(count_dict, variable_type, col_names_dict, column_name)

        elif 'bool' in var:
            update_count_dict(count_dict, "Boolean", col_names_dict, column_name)

        else:
            update_count_dict(count_dict, "Unclassified", col_names_dict, column_name)

    return count_dict, col_names_dict

#####################################################################################################

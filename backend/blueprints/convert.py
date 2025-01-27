# blueprints/convert.py

from flask import Blueprint, request, send_file, jsonify
import pandas as pd
import os
import h5py
import traceback 

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
convert = Blueprint('convert', __name__)

def read_excel(file):
    """
    Reads the Excel file and processes it into a desirable dataframe.
    Returns (file_name, df, metadata).
    """
    df = pd.read_excel(file)
    file_name = file.replace(".xlsx", ".h5")
    
    # Extract metadata
    metadata = {
        "CableSystemName": df.columns[5],
        "MainRoute": df.iloc[0, 5],
        "Issue": df.columns[15],
        "Engineer": df.iloc[1, 15] if pd.notna(df.iloc[1, 15]) else "unknown",
        "IssueDate": df.iloc[2, 15]
    }
    
    # Rename columns
    df.columns = [
        'Pos No.', 'Latitude', 'Longitude', 'Depth', 'Heading', 'Course Change',
        'Route Distance Between', 'Route Distance Total', 'Slack',
        'Cable Distance Between', 'Cable Distance Total', 'Cable Span',
        'Cable Type', 'Comments', 'Auto Label', 'Label'
    ]

    # Drop first 5 rows
    df.drop(index=[0,1,2,3,4], inplace=True)
    df.reset_index(inplace=True, drop=True)

    # Merge rows in pairs of 2
    merged_rows = []
    for i in range(0, len(df), 2):
        if i+1 < len(df):
            merged_row = df.iloc[i].combine_first(df.iloc[i+1])
            merged_rows.append(merged_row)
        else:
            merged_rows.append(df.iloc[i])

    df = pd.DataFrame(merged_rows).reset_index(drop=True)

    # Extract lat/long direction & decimal degrees
    df['Latitude_Direction'] = df['Latitude'].str[0]
    df['Latitude_Degrees'] = df['Latitude'].str[1:].str.split().str[0].astype(float)
    df['Latitude_Minutes'] = df['Latitude'].str[1:].str.split().str[1].astype(float)

    df['Longitude_Direction'] = df['Longitude'].str[0]
    df['Longitude_Degrees'] = df['Longitude'].str[1:].str.split().str[0].astype(float)
    df['Longitude_Minutes'] = df['Longitude'].str[1:].str.split().str[1].astype(float)

    df['latitude_coord'] = df['Latitude_Degrees'] + (df['Latitude_Minutes']/60)
    df['longitude_coord'] = df['Longitude_Degrees'] + (df['Longitude_Minutes']/60)

    return file_name, df, metadata

def create_hdf5(file_name, df, metadata):
    """
    Creates an HDF5 file from the DataFrame & metadata.
    """
    with h5py.File(file_name, 'w') as hdf:
        # Root group attrs
        hdf.attrs['FileName'] = str(file_name)
        hdf.attrs['CableSystemName'] = str(metadata["CableSystemName"])
        hdf.attrs['MainRoute'] = str(metadata["MainRoute"])
        hdf.attrs['Issue'] = str(metadata["Issue"])
        hdf.attrs['Engineer'] = str(metadata["Engineer"])
        hdf.attrs['IssueDate'] = str(metadata["IssueDate"])
        hdf.attrs['GeodeticDatum'] = "WGS84"
        hdf.attrs['VerticalDatum'] = "LAT"
        hdf.attrs['BoundingBox'] = "xmin, ymin, xmax, ymax"
        hdf.attrs['Units'] = "meters (depth), kilometers (distances), percentages (slack)"

        # Feature group
        group_f = hdf.create_group("Group_F")
        group_f.attrs['FeatureNames'] = "SubmarineCable, Repeater"
        group_f.attrs['FeatureDefinitions'] = "Definitions of SubmarineCable and Repeater"
        group_f.create_dataset("FeatureCatalogue", data=[])

        # Feature container group
        feature_container_1 = hdf.create_group("Feature_Container_1")
        feature_container_1.attrs['ClassName'] = "SubmarineCableSegment"
        feature_container_1.attrs['FeatureMetadata'] = "Metadata for SubmarineCableSegment"

        # Feature instance group
        feature_instance_1 = feature_container_1.create_group("Feature_Instance_1")
        feature_instance_1.attrs['FeatureID'] = "CableSegment001"
        feature_instance_1.attrs['InstanceMetadata'] = "InstallationDate: 2025-01-01; MaintenanceStatus: Operational"
        feature_instance_1.attrs['SpatialParameters'] = "xmin, ymin, xmax, ymax"

        # Positioning group
        group_positioning = hdf.create_group("Group_Positioning")
        group_positioning.create_dataset("Latitude", data=df['Latitude'].values)
        group_positioning.create_dataset("Longitude", data=df['Longitude'].values)
        depth_dataset = group_positioning.create_dataset("Depth", data=df['Depth'].astype(float).values)
        depth_dataset.attrs['Units'] = "meters"

        # Data values group
        group_data = hdf.create_group("Group_Data")
        route_position_list = group_data.create_group("Route_Position_List")

        event_number_dataset = route_position_list.create_dataset("Event_Number", data=df['Pos No.'].fillna(-1).astype(int).values)
        event_number_dataset.attrs['Description'] = "Position number of the event"

        route_position_list.create_dataset("Event_Label", data=df['Label'].fillna("").astype(str).values.astype('S'))
        route_position_list.create_dataset("Latitude_Degrees", data=df['Latitude_Degrees'].values)
        route_position_list.create_dataset("Latitude_Direction", data=df['Latitude_Direction'].fillna("").astype(str).values.astype('S'))
        route_position_list.create_dataset("Longitude_Degrees", data=df['Longitude_Degrees'].values)
        route_position_list.create_dataset("Longitude_Direction", data=df['Longitude_Direction'].fillna("").astype(str).values.astype('S'))

        water_depth_dataset = route_position_list.create_dataset("Water_Depth", data=df['Depth'].fillna(0).astype(float).values)
        water_depth_dataset.attrs['Units'] = "meters"

        route_distance_dataset = route_position_list.create_dataset(
            "Route_Distance_From_Last_Position", data=df['Route Distance Between'].fillna(0).astype(float).values)
        route_distance_dataset.attrs['Units'] = "kilometers"

        cumulative_route_dataset = route_position_list.create_dataset(
            "Cumulative_Route_Distance", data=df['Route Distance Total'].fillna(0).astype(float).values)
        cumulative_route_dataset.attrs['Units'] = "kilometers"

        slack_dataset = route_position_list.create_dataset(
            "Slack", data=df['Slack'].fillna(0).astype(float).values)
        slack_dataset.attrs['Units'] = "percentages"

        cable_distance_dataset = route_position_list.create_dataset(
            "Cable_Distance_From_Last_Position", data=df['Cable Distance Between'].fillna(0).astype(float).values)
        cable_distance_dataset.attrs['Units'] = "kilometers"

        cumulative_cable_dataset = route_position_list.create_dataset(
            "Cumulative_Cable_Distance", data=df['Cable Distance Total'].fillna(0).astype(float).values)
        cumulative_cable_dataset.attrs['Units'] = "kilometers"

        route_position_list.create_dataset("Cable_Type", data=df['Auto Label'].fillna("").astype(str).values.astype('S'))
        route_position_list.create_dataset("Additional_Route_Features", data=df['Label'].fillna("").astype(str).values.astype('S'))

        # Comments as metadata
        for index, row in df.iterrows():
            if pd.notna(row['Comments']):
                pos_group = route_position_list.create_group(f"Position_{int(row['Pos No.'])}")
                pos_group.attrs['Comments'] = row['Comments']


@convert.route('/convert', methods=['POST'])
def convert_file():
    # 1) Grab the uploaded file
    file = request.files.get('file')
    if not file:
        return jsonify({"error": "No file provided"}), 400

    if not file.filename.lower().endswith('.xlsx'):
        return jsonify({"error": "Only .xlsx files are supported"}), 400

    # 2) Save the uploaded file temporarily
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    try:
        # 3) Process the Excel to get the HDF5 name, DataFrame, and metadata
        file_name, df, metadata = read_excel(file_path)
        
        # file_name might be something like "myfile.h5"
        # If you want to store it in the uploads folder, do:
        hdf5_path = os.path.join(UPLOAD_FOLDER, os.path.basename(file_name))

        # 4) Create the HDF5
        create_hdf5(hdf5_path, df, metadata)

        # 5) Return the HDF5 as an attachment
        return send_file(
            hdf5_path,
            as_attachment=True,
            download_name=os.path.basename(hdf5_path),
            mimetype='application/x-hdf5'
        )

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Error processing file: {str(e)}"}), 500

    finally:
        # Clean up the uploaded Excel file
        if os.path.exists(file_path):
            os.remove(file_path)
        # (Optional) decide if you want to remove the hdf5 file after sending
        # if os.path.exists(hdf5_path):
        #     os.remove(hdf5_path)

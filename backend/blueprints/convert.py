from flask import Blueprint, Flask, request, send_file
import pandas as pd
import os

# Setup
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
convert = Blueprint('convert', __name__)

# Actual function
@convert.route('/convert', methods=['POST'])
def convert_file():
    file = request.files['file']
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file_path)
            df['Processed'] = 'Yes'  # Add a new column

            # Save the processed file
            processed_file_path = os.path.join(UPLOAD_FOLDER, f"processed_{file.filename}")
            df.to_csv(processed_file_path, index=False)

            # Return the processed file
            return send_file(
                processed_file_path,
                as_attachment=True,
                download_name=f"processed_{file.filename}",
                mimetype='text/csv'
            )
        else:
            return {"error": "Unsupported file format"}, 400
    except Exception as e:
        return {"error": f"Error processing file: {str(e)}"}, 500
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
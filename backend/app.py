from flask import Flask, request, send_file
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)  # This makes sure that browser can allow simultaneous backend and frontend running in same server

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/convert', methods=['POST'])
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
s
from flask import Flask
from flask_cors import CORS
from blueprints.convert import convert

app = Flask(__name__)
CORS(app)  # This makes sure that browser can allow simultaneous backend and frontend running in same server

# Register Blueprints
app.register_blueprint(convert)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
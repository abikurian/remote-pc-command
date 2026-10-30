from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Server is running"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)


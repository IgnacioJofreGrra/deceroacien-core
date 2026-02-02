import os
from flask import Flask, jsonify
from dotenv import load_dotenv

# Cargar variables desde archivo .env
load_dotenv()

app = Flask(__name__)

# Load configuration from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "")



@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy"
    }), 200


@app.route("/public-config", methods=["GET"])
def public_config():
    """Public configuration endpoint (read from environment)"""
    return jsonify({
        "projectId": GCP_PROJECT_ID
    }), 200


if __name__ == "__main__":
    app.run(debug=True)

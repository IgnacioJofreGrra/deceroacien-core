import os
from flask import Flask, jsonify, send_from_directory
from dotenv import load_dotenv

# Cargar variables desde archivo .env
load_dotenv()

app = Flask(__name__)

# Load configuration from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "")


FRONTEND_PUBLIC = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public"))

@app.route("/", defaults={"path": "index.html"})
@app.route("/<path:path>")
def serve_frontend(path):
    file_path = os.path.join(FRONTEND_PUBLIC, path)
    if os.path.exists(file_path):
        return send_from_directory(FRONTEND_PUBLIC, path)
    # Fallback to index for SPA routes
    return send_from_directory(FRONTEND_PUBLIC, "index.html")

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

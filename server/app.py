import logging
from flask import Flask, jsonify
from flask_cors import CORS
import psutil

try:
    import GPUtil
except ImportError:
    GPUtil = None

logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Prime psutil.cpu_percent so subsequent non-blocking calls return meaningful values
psutil.cpu_percent(interval=None)


def get_system_stats():
    """Collect hardware telemetry for CPU, RAM, and GPU.

    Returns:
        dict: System telemetry with cpu_percent, ram_percent, gpu_load_percent,
              and gpu_temp. Defaults GPU fields to 0 if unavailable or if an error occurs.
    """
    # CPU & RAM telemetry
    cpu_percent = psutil.cpu_percent(interval=None)
    ram_percent = psutil.virtual_memory().percent

    gpu_load_percent = 0.0
    gpu_temp = 0.0

    if GPUtil is not None:
        try:
            gpus = GPUtil.getGPUs()
            if gpus:
                primary_gpu = gpus[0]
                # GPUtil returns load as a decimal (0.0 - 1.0) or None
                if primary_gpu.load is not None:
                    gpu_load_percent = round(primary_gpu.load * 100, 2)
                if primary_gpu.temperature is not None:
                    gpu_temp = float(primary_gpu.temperature)
        except Exception as exc:
            logger.warning("Failed to retrieve GPU statistics: %s", exc)

    return {
        "cpu_percent": cpu_percent,
        "ram_percent": ram_percent,
        "gpu_load_percent": gpu_load_percent,
        "gpu_temp": gpu_temp,
    }


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Server is running"})


@app.route("/api/stats", methods=["GET"])
def get_stats():
    stats = get_system_stats()
    return jsonify(stats)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
